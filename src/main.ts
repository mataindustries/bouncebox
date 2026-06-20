import { BounceBoxApp } from './app/BounceBoxApp';
import './styles.css';

const root = document.querySelector<HTMLElement>('#app');

if (!root) {
  throw new Error('Missing #app root element.');
}

new BounceBoxApp(root).mount();
