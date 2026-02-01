import { sveltekit } from '@sveltejs/kit/vite';
import sqlocalPlugin from 'sqlocal/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), sqlocalPlugin()],
});
