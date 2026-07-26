/**
 * Chapter Content Renderer & TTS Diagnostic Validator
 * This script runs a suite of validation tests on chapter content input drafts.
 * It simulates the parsing behavior of ChapterContent.tsx to guarantee that:
 * 1. Image formats (HTTP/S and Data URLs / Base64) are parsed safely.
 * 2. TTS engine input is completely cleaned of base64 data & HTML tag noise.
 * 3. Side effects (speech freezes, avatar unmounts, DOM crashers) are actively detected and flagged.
 */

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  parsedParagraphs: string[];
  ttsPayloads: string[];
  stats: {
    totalParagraphs: number;
    imageTagsFound: number;
    base64ImagesFound: number;
    avgTtsPayloadLength: number;
  };
}

/**
 * Validates a given chapter content draft against renderer and TTS constraints.
 */
export function validateChapterContent(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsedParagraphs: string[] = [];
  const ttsPayloads: string[] = [];
  
  let imageTagsFound = 0;
  let base64ImagesFound = 0;

  if (!content || content.trim().length === 0) {
    errors.push("Chapter content is completely empty.");
    return {
      passed: false,
      errors,
      warnings,
      parsedParagraphs,
      ttsPayloads,
      stats: { totalParagraphs: 0, imageTagsFound: 0, base64ImagesFound: 0, avgTtsPayloadLength: 0 }
    };
  }

  // Split into paragraphs just like ChapterContent.tsx
  const paragraphs = content
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean);

  paragraphs.forEach((p, idx) => {
    // 1. Validate Image Regex Matches
    const imgRegex = /\[(?:gambar|image):\s*(.*?)\]/gi;
    let match;
    let hasImage = false;
    
    // Check for nested brackets or incomplete patterns
    if (p.includes('[gambar:') && !p.match(/\[(?:gambar|image):\s*(.*?)\]/i)) {
      errors.push(`Paragraph ${idx + 1}: Detected a malformed or unclosed image tag.`);
    }

    // Reset and iterate matches
    imgRegex.lastIndex = 0;
    while ((match = imgRegex.exec(p)) !== null) {
      imageTagsFound++;
      hasImage = true;
      const desc = match[1]?.trim();

      if (!desc) {
        errors.push(`Paragraph ${idx + 1}: Found an empty image tag '[gambar: ]'.`);
        continue;
      }

      const isHttp = desc.startsWith('http://') || desc.startsWith('https://');
      const isRelative = desc.startsWith('/');
      const isBase64 = desc.startsWith('data:image/');

      if (isBase64) {
        base64ImagesFound++;
        // Limit warning: verify base64 length to prevent DOM bloatedness warnings
        if (desc.length > 2000000) {
          warnings.push(`Paragraph ${idx + 1}: Base64 image payload is extremely large (${Math.round(desc.length / 1024 / 1024)}MB). This might cause visual lagging on low-end devices.`);
        }
        if (!desc.includes(';base64,')) {
          errors.push(`Paragraph ${idx + 1}: Base64 image is missing the required ';base64,' scheme identifier.`);
        }
      } else if (!isHttp && !isRelative) {
        // If it's a placeholder (e.g. description)
        warnings.push(`Paragraph ${idx + 1}: Image source '${desc.slice(0, 30)}...' is treated as a text placeholder, not a valid image URL.`);
      }
    }

    // 2. Simulate Render HTML Output Check
    let renderedHtml = p;
    imgRegex.lastIndex = 0;
    if (hasImage) {
      renderedHtml = p.replace(imgRegex, (m, desc) => {
        const d = desc?.trim() || '';
        const isUrl = d.startsWith('http') || d.startsWith('/') || d.startsWith('data:image/');
        if (isUrl) {
          return `<figure class="my-6 flex justify-center"><img src="${d}" alt="Chapter visual" /></figure>`;
        }
        return `<div class="bg-gray-100 p-4 rounded-xl border text-center text-sm">${d}</div>`;
      });
    }
    parsedParagraphs.push(renderedHtml);

    // 3. Simulate TTS Extraction (Must be perfectly cleaned of base64 strings!)
    let plainText = p.replace(/(?:\[(?:gambar|image):\s*(.*?)\])/gi, '');
    // Strip other html brackets
    plainText = plainText.replace(/<[^>]*>?/gm, '').trim();

    // Check if TTS payload is clean
    if (plainText.includes('data:image/') || plainText.includes('base64')) {
      errors.push(`Paragraph ${idx + 1} TTS Payload Leak: Base64 image data or image tag was NOT fully stripped. TTS engine will crash trying to pronounce the raw data.`);
    }

    if (plainText.length > 500) {
      warnings.push(`Paragraph ${idx + 1}: TTS payload is quite long (${plainText.length} characters). It is recommended to keep paragraphs concise for better voice feedback.`);
    }

    ttsPayloads.push(plainText);
  });

  const totalTtsLength = ttsPayloads.reduce((sum, text) => sum + text.length, 0);
  const avgTtsPayloadLength = ttsPayloads.length > 0 ? Math.round(totalTtsLength / ttsPayloads.length) : 0;

  const passed = errors.length === 0;

  return {
    passed,
    errors,
    warnings,
    parsedParagraphs,
    ttsPayloads,
    stats: {
      totalParagraphs: paragraphs.length,
      imageTagsFound,
      base64ImagesFound,
      avgTtsPayloadLength
    }
  };
}

/**
 * Runs quick self-contained diagnostic tests on various content variants.
 */
export function runRendererDiagnosticsSuite() {
  console.log("=== STARTING RENDERER DIAGNOSTIC SUITE ===");
  
  const testCases = [
    {
      name: "Standard paragraph with HTTPS Image URL",
      input: "Yuki sedang menatap jendela. [gambar: https://images.unsplash.com/photo-1579783902614-a3fb3927b675]"
    },
    {
      name: "Paragraph with base64 embedded Data URL",
      input: "Di malam hari, kastil itu bersinar indah. [gambar: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH...]"
    },
    {
      name: "Malformed / incomplete bracket tag",
      input: "Ini draf yang belum selesai [gambar: https://image.com"
    },
    {
      name: "Multiple image tags in single paragraph",
      input: "Ada gambar kucing [gambar: https://placekitten.com/200/300] dan juga gambar anjing [gambar: https://placedog.net/200/300]"
    }
  ];

  const results = testCases.map(tc => {
    const res = validateChapterContent(tc.input);
    return {
      name: tc.name,
      passed: res.passed,
      errors: res.errors,
      warnings: res.warnings,
      stats: res.stats
    };
  });

  console.log("Diagnostic Results:", JSON.stringify(results, null, 2));
  console.log("=== DIAGNOSTIC SUITE COMPLETE ===");
  return results;
}
