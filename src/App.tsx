/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Home from './components/Home';
import ChapterView from './components/ChapterView';
import AdminDashboard from './components/AdminDashboard';
import Bookmarks from './components/Bookmarks';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="chapter/:chapterId" element={<ChapterView />} />
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="bookmarks" element={<Bookmarks />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
