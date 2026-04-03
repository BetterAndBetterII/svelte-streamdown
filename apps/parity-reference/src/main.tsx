import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../parity-shared/app-shell.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('app')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
