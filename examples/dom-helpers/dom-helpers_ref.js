import { create } from '../../utils/dom-helpers.js';

function listItem(text) {
  return {
    tag: 'li',
    properties: {
      textContent: text,
    },
  };
};

let app = create({
  tag: 'div',
  styles: {
    backgroundColor: '#000',
    color: '#fff',
    padding: '20px',
    'font-size': '20px',
  },
  attributes: {
    contenteditable: true,
  },
  properties: {
    onclick: (e) => {
      e.target.innerHTML = '';
    },
  },
  children: [
    {
      tag: 'ul',
      children: [
        listItem('Item 1'),
        listItem('Item 2'),
        listItem('Item 3'),
        listItem('Item 4'),
      ],
    },
  ],
});

document.body.appendChild(app);