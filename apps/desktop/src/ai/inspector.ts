export const INSPECTOR_SCRIPT = `
(function() {
  let active = false;
  let hoveredElement = null;
  const OUTLINE_STYLE = '2px solid #d97706'; // Amber-600

  // Helper: Generate precise CSS selector
  function getSelector(el) {
    if (el.tagName.toLowerCase() === 'html') return 'html';
    if (el.tagName.toLowerCase() === 'body') return 'body';
    
    let str = el.tagName.toLowerCase();
    
    // 1. ID is best
    if (el.id) {
      str += '#' + el.id;
      return str; // ID is unique, no need for more
    } 
    
    // 2. Classes
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(/\\s+/).filter(c => 
        c !== 'outline-amber-600' && !c.startsWith('hover:') // Filter utility states if needed
      ); 
      if (classes.length > 0) {
        // Use only the first 2 classes to avoid overly specific tailwind selectors that might confuse AI
        str += '.' + classes.slice(0, 2).join('.');
      }
    }

    // 3. Nth-of-type (Crucial for lists/grids)
    if (el.parentElement) {
      const siblings = Array.from(el.parentElement.children).filter(child => child.tagName === el.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(el) + 1;
        str += \`:nth-of-type(\${index})\`;
      }
    }

    return str;
  }

  function getPath(el) {
    const path = [];
    let current = el;
    
    // Climb up to 4 levels or until Body/ID
    let depth = 0;
    while (current && current.nodeType === Node.ELEMENT_NODE && depth < 4) {
        let selector = getSelector(current);
        path.unshift(selector);
        
        if (current.id || current.tagName.toLowerCase() === 'body') break;
        
        current = current.parentElement;
        depth++;
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
    
    // Cleanup visual artifacts
    const clone = target.cloneNode(true);
    clone.style.outline = '';
    
    const payload = {
        tag: target.tagName.toLowerCase(),
        id: target.id || null,
        className: target.className || null,
        text: target.innerText.substring(0, 150).replace(/\\s+/g, ' '), // Clean whitespace
        selector: getPath(target), // SMART SELECTOR
        snippet: clone.outerHTML.substring(0, 500) // Limit snippet size
    };
    
    window.parent.postMessage({ type: 'ELEMENT_CLICKED', payload }, '*');
  }, true);
})();
`;
