var default_options = [{
  option: 'image-base',
  alias: 'i',
  type: 'String',
  description: 'base of filename',
}, {
  option: 'num-obs-steps',
  alias: 't',
  type: 'Int',
  description: 'num observation steps',
  default: '50',
}, {
  option: 'num-ro-steps',
  alias: 'p',
  type: 'Int',
  default: '25',
  description: 'num rollout steps',
}, {
  option: 'num-groups',
  alias: 'n',
  type: 'Int',
  default: '5',
  description: 'num groups',
}, {
  option: 'output-base',
  alias: 'o',
  type: 'String',
  default: '../jsons/data',
  description: 'base of json output',
}, {
  option: 'state-file',
  alias: 'f',
  type: 'String',
  description: 'file of states to render',
}, {
  option: 'start-idx',
  type: 'Int',
  alias: 's',
  description: 'Start index',
  default:'0',
}, {
  option: 'physics',
  type: 'String',
  description: 'type of physics',
  enum: ['spring', 'collision', 'friction'],
  default:'spring'
}, {
  option: 'num-bodies',
  type: 'Int',
  description: 'num bodies',
  default:'3',
}, {
  option: 'width',
  type: 'Int',
  description: 'frame width',
  default:'512',
}, {
  option: 'height',
  type: 'Int',
  description: 'frame height',
  default:'512',
},{
  option: 'max-vel',
  type: 'Int',
  description: 'max velocity',
  default:'25',
},{
  option: 'body-radius',
  type: 'Int',
  description: 'body radius',
  default:'70',
}, {
  option: 'predict-mean',
  type: 'Boolean',
  description: 'In addition to a rollout using the true encoding, also perform rollout with mean encoding'
}, {
  option: 'batch',
  type: 'Boolean',
}, {
  option: 'batch-size',
  type: 'Int',
  default: '1000'
}];

var spring_options = [{
  option: 'min-const',
  type:'Float',
  description: 'minimum spring constant',
  default: '5e-5',
}, {
  option:'max-const',
  type:'Float',
  description:'maximum spring constant',
  default:'30e-5',
}, {
  option:'min-disp',
  type:'Float',
  description:'minimum displacement',
  default:'50',
}, {
  option:'max-disp',
  type:'Float',
  description:'maximum displacement',
  default:'300',
}];

var collision_options = [{
  option: 'fix-first',
  type:'Boolean',
  description: 'fix first object to the mean mass',
}, {
  option:'min-mass',
  type:'Float',
  description:'minimum mass',
  default:'2',
}, {
  option:'max-mass',
  type:'Float',
  description:'maximum mass',
  default:'12',
}, {
  option: 'min-collide',
  type:'Boolean',
  description: 'guarantee # of collision pairs in obs phase is as small as possible.'
}, {
  option: 'all-collide',
  type: 'Boolean',
  description:'guarantee all pairs of objects collide with each other.'
}, {
  option: 'col-window-start',
  type: 'Int',
  description:'collision must happen in [colWindowStart, colWindowEnd)',
  default:'5'
}, {
  option: 'col-window-end',
  type: 'Int',
  description:'collision must happen in [colWindowStart, colWindowEnd)',
  default:'13'
}];

var optionator = require('optionator')({
  options: default_options.concat(spring_options).concat(collision_options)
});

module.exports = optionator;
