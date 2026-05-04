// js/queue.js

import { appState } from "./state.js";
import { isRecentlyPlayed } from "./history.js";

const API_URL =
  "YOUR_GOOGLE_APPS_SCRIPT_URL";

const QUEUE_SIZE = 3;

async function fetchRandomVideo() {
  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 6000);

  try {
    const res = await fetch(API_URL, {
      signal: controller.signal,
      cache: "no-store"
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(
        `API error: ${res.status}`
      );
    }

    const data = await res.json();

    if (
      !data ||
      !data.video
    ) {
      throw new Error(
        "Invalid API response"
      );
    }

    return data;

  } catch (err) {

    clearTimeout(timeout);

    console.error(
      "Video fetch failed:",
      err
    );

    return null;
  }
}

export async function fetchWithRetry(
  retries = 2
) {

  for (
    let attempt = 0;
    attempt <= retries;
    attempt++
  ) {

    const video =
      await fetchRandomVideo();

    if (video) {
      return video;
    }
  }

  return null;
}

export async function maintainQueue() {

  if (appState.maintainingQueue) {
    return;
  }

  appState.maintainingQueue = true;

  try {

    const needed =
      QUEUE_SIZE -
      appState.videoQueue.length;

    if (needed <= 0) {
      return;
    }

    const results = [];

    for (
      let i = 0;
      i < needed;
      i++
    ) {

      const video =
        await fetchWithRetry();

      if (video) {
        results.push(video);
      }
    }

    const fallback = [];

    for (const video of results) {

      if (
        !isRecentlyPlayed(
          video.video
        )
      ) {

        appState.videoQueue.push(
          video
        );

      } else {

        fallback.push(video);
      }
    }

    if (
      appState.videoQueue.length === 0 &&
      fallback.length > 0
    ) {

      appState.videoQueue.push(
        fallback[0]
      );
    }

  } finally {

    appState.maintainingQueue = false;
  }
}

export function dequeueVideo() {

  return appState.videoQueue.shift();
}

export function clearQueue() {

  appState.videoQueue.length = 0;
}

export function getQueueLength() {

  return appState.videoQueue.length;
}