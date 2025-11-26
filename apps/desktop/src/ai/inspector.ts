export const INSPECTOR_SCRIPT = `
(function() {
  let active = false;
  let hoveredElement = null;
  const OUTLINE_STYLE = '2px solid #d97706'; // Amber-600 to match Aether theme

  // Helper: Generate unique CSS selector
  function getSelector(el) {
    if (el.tagName.toLowerCase() === 'html') return 'html';
    if (el.tagName.toLowerCase() === 'body') return 'body';
    
    let str = el.tagName.toLowerCase();
    if (el.id) {
      str += '#' + el.id;
    } else if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(/\\s+/).filter(c => c !== 'outline-amber-600'); 
      if (classes.length > 0) {
        str += '.' + classes.join('.');
      }
    }
    return str;
  }

  function getPath(el) {
    const path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
        let selector = getSelector(el);
        path.unshift(selector);
        el = el.parentElement;
        if (selector.includes('#')) break; // Stop at ID as it is unique
    }
    return path.join(' > ');
  }

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
    
    // Clone and clean element to remove inspector styles
    const clone = target.cloneNode(true);
    clone.style.outline = '';
    clone.style.cursor = '';
    if (target.getAttribute('style') === null) clone.removeAttribute('style');

    const payload = {
        tag: target.tagName.toLowerCase(),
        id: target.id || null,
        className: target.className || null,
        text: target.innerText.substring(0, 100), // Grab more context text
        selector: getPath(target), // FULL CSS SELECTOR
        snippet: clone.outerHTML
    };
    
    window.parent.postMessage({ type: 'ELEMENT_CLICKED', payload }, '*');
  }, true);
})();
`;
