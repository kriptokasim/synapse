export const INSPECTOR_SCRIPT = `
(function() {
  let active = false;
  let hoveredElement = null;
  const OUTLINE_STYLE = '2px solid #d97706';

  window.addEventListener('message', (event) => {
    if (event.data.type === 'TOGGLE_INSPECTOR') {
      active = event.data.active;
      if (!active && hoveredElement) {
        hoveredElement.style.outline = '';
        hoveredElement = null;
      }
    }
  });

  document.addEventListener('mouseover', (e) => {
    if (!active) return;
    e.stopPropagation();
    
    if (hoveredElement) hoveredElement.style.outline = '';
    hoveredElement = e.target;
    hoveredElement.style.outline = OUTLINE_STYLE;
    hoveredElement.style.cursor = 'crosshair';
  }, true);

  document.addEventListener('click', (e) => {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    
    // ⚡ CRITICAL FIX: Clone and clean element to remove our inspector styles
    const clone = target.cloneNode(true);
    clone.style.outline = '';
    clone.style.cursor = '';
    
    // Also clean up if the original had no style attribute initially
    if (target.getAttribute('style') === null) {
        clone.removeAttribute('style');
    }

    const snippet = clone.outerHTML; // Now clean!
    const text = target.innerText;
    const tag = target.tagName.toLowerCase();
    const id = target.id || null;
    const className = target.className || null;
    
    // Build a robust selector
    let selector = tag;
    if (id) selector += '#' + id;
    else if (className) selector += '.' + className.split(' ').join('.');

    window.parent.postMessage({
      type: 'ELEMENT_CLICKED',
      payload: { tag, text, snippet, selector, id, className }
    }, '*');
  }, true);
})();
`;
