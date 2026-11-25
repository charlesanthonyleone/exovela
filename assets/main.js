/* Studio and figure pages only: live 3D garment. */
import { mountAll, mountGarment, SKIN_LIST } from './garment3d.js';
const ready = mountAll().then(apis => {
  window.ExovelaGarments = apis;
  document.dispatchEvent(new CustomEvent('exovela-ready', { detail: apis }));
  return apis;
});
window.Exovela = { SKIN_LIST, ready, mountGarment, get apis() { return window.ExovelaGarments || []; } };
