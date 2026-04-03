import { mount } from 'svelte';
import '../../parity-shared/app-shell.css';
import App from './App.svelte';

mount(App, {
	target: document.getElementById('app')!
});
