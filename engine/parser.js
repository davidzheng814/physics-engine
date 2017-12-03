var optionator = require('optionator')({
  options: [{
    option: 'image-base',
    alias: 'i',
    type: 'String',
    description: 'base of filename',
    required: false
  }, {
    option: 'num-obs-steps',
    alias: 't',
    type: 'Int',
    description: 'num observation steps',
    required: false
  }, {
    option: 'num-ro-steps',
    alias: 'p',
    type: 'Int',
    description: 'num rollout steps',
    required: false
  }, {
    option: 'num-groups',
    alias: 'n',
    type: 'Int',
    description: 'num groups',
    required: false
  }, {
    option: 'output-base',
    alias: 'o',
    type: 'String',
    description: 'base of json output',
    required: false
  }, {
    option: 'state-file',
    alias: 'f',
    type: 'String',
    description: 'file of states to render',
    required: false
  }, {
    option: 'start-idx',
    type: 'Int',
    alias: 's',
    description: 'Start index',
    default:'0',
    required: false
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
    required: false
  }, {
    option: 'width',
    type: 'Int',
    description: 'frame width',
    default:'512',
    required: false
  }, {
    option: 'height',
    type: 'Int',
    description: 'frame height',
    default:'512',
    required: false
  },{
    option: 'max-vel',
    type: 'Int',
    description: 'max velocity',
    default:'25',
    required: false
  },{
    option: 'body-radius',
    type: 'Int',
    description: 'body radius',
    default:'25',
    required: false
  }]
});

module.exports = optionator;
