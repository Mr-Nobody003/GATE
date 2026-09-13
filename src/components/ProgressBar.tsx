"use client";

import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';

export function TopProgressBar() {
  return (
    <ProgressBar
      height="3px"
      color="#6366f1" // indigo-500
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}
