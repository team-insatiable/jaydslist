import { dev } from '$app/environment';

// Compile-time SvelteKit flag: production builds cannot enable this through
// request parameters or operator environment variables.
export const localPhotos = dev;
export const localPhotoKey = (id: string) => `dev:photo:${id}`;
