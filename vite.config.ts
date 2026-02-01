import { sveltekit } from '@sveltejs/kit/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import sqlocalPlugin from 'sqlocal/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), sqlocalPlugin(), basicSsl()],
	server: {
		https: true,
	},
});
