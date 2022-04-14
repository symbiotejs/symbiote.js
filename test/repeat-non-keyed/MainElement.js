import { BaseComponent } from '../../core/BaseComponent.js';
import { Data } from '../../core/Data.js';
import { adjectives, colours, nouns } from './dict.js';
import { random } from './util.js';

const schema = {
  id: String,
  label: String,
  selected: Boolean,
  class: String,
};

export class MainElement extends BaseComponent {
  init$ = {
    listItems: [],
    id: 1,

    run: () => {
      this.$.listItems = this.buildItem(1000);
    },
    runLots: () => {
      this.$.listItems = this.buildItem(10000);
    },
    add: () => {
      let items = this.buildItem(1000);
      this.$.listItems.push(...items);
      this.$.listItems = this.$.listItems;
    },
    update: () => {
      for (let i = 0; i < this.$.listItems.length; i += 10) {
        this.$.listItems[i].pub('label', this.$.listItems[i].read('label') + ' !!!');
      }
    },
    clear: () => {
      this.$.listItems = [];
    },
    swapRows: () => {
      if (this.$.listItems.length > 998) {
        let temp = this.$.listItems[1];
        let temp2 = this.$.listItems[998];
        this.$.listItems.splice(1, 1, temp2);
        this.$.listItems.splice(998, 1, temp);
      }
      this.$.listItems = this.$.listItems;
    },

    handleClick: (e) => {
      let { action, id } = e.target.dataset;
      if (action && id) {
        this.$[action](id);
      }
    },
    select: (id) => {
      id = parseInt(id, 10);
      for (let item of this.$.listItems) {
        let selected = item.read('id') == id;
        let className = selected ? 'danger' : '';
        item.read('selected') !== selected && item.pub('selected', selected);
        item.read('class') !== className && item.pub('class', className);
      }
    },
    remove: (id) => {
      id = parseInt(id, 10);
      const idx = this.$.listItems.findIndex((item) => item.read('id') === id);
      this.$.listItems.splice(idx, 1);
      this.$.listItems = this.$.listItems;
    },
  };

  buildItem(count = 1000) {
    let data = [];
    for (let i = 0; i < count; i++) {
      let id = this.$.id++;
      let label = adjectives[random(adjectives.length)] + ' ' + colours[random(colours.length)] + ' ' + nouns[random(nouns.length)];
      let item = new Data({ schema });
      item.multiPub({
        id,
        label,
        selected: false,
        class: '',
      });
      data.push(item);
    }
    return data;
  }
}

MainElement.template = /*html*/ `
<div class="container">
  <div class="jumbotron">
    <div class="row">
      <div class="col-md-6">
          <h1>Symbiote.js non-keyed</h1>
      </div>
      <div class="col-md-6">
        <div class="row">
          <div class="col-sm-6 smallpad">
          <button type="button" class="btn btn-primary btn-block" id="run" set="onclick: run">Create 1,000 rows</button>
          </div>
          <div class="col-sm-6 smallpad">
              <button type="button" class="btn btn-primary btn-block" id="runlots" set="onclick: runLots">Create 10,000 rows</button>
          </div>
          <div class="col-sm-6 smallpad">
              <button type="button" class="btn btn-primary btn-block" id="add" set="onclick: add">Append 1,000 rows</button>
          </div>
          <div class="col-sm-6 smallpad">
              <button type="button" class="btn btn-primary btn-block" id="update" set="onclick: update">Update every 10th row</button>
          </div>
          <div class="col-sm-6 smallpad">
              <button type="button" class="btn btn-primary btn-block" id="clear" set="onclick: clear">Clear</button>
          </div>
          <div class="col-sm-6 smallpad">
              <button type="button" class="btn btn-primary btn-block" id="swaprows" set="onclick: swapRows">Swap Rows</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <table class="table table-hover table-striped test-data">
    <tbody repeat-items="listItems" set="onclick: handleClick">
      <tr repeat-set="@id: id; @class: class; @selected: selected">
        <td class="col-md-1">{{id}}</td>
        <td class="col-md-4">
          <a data-action="select" repeat-set="@data-id: id;">{{label}}</a>
        </td>
        <td class="col-md-1">
          <a>
            <span
              class="glyphicon glyphicon-remove"
              aria-hidden="true"
              data-action="remove"
              repeat-set="@data-id: id;"
            ></span>
          </a>
        </td>
        <td class="col-md-6"></td>
      </tr>
    </tbody>
  </table>
  <span class="preloadicon glyphicon glyphicon-remove" aria-hidden="true"></span>
</div>
`;
