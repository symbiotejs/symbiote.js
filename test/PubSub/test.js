import PubSub from '../../core/PubSub.js';

let pbData1 = new PubSub({
  opt1: 'some val',
  opt2: 123,
});

let pbData2 = PubSub.registerCtx({
  opt: 'some val',
});

pbData2.sub('opt', (val) => {
  console.log(val);
});

pbData1.proxy.opt1 = '123123';
pbData1.proxy.opt2 = 999;
// pbData2.proxy.opt2 = 12; // expect TS error

pbData2.proxy.opt = 'some string';