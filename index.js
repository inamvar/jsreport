/*!
 * Copyright(c) 2014 Jan Blaha
 */

var extend = require('node.extend')
var fs = require('fs')
var path = require('path')
var core = require('jsreport-core')
var _ = require('underscore')
var main = require('./lib/main')
var packageJson = require('./package.json')

function initializeApp (force) {
  if (!fs.existsSync('server.js') || force) {
    console.log('Creating server.js')
    fs.writeFileSync('server.js', fs.readFileSync(path.join(__dirname, 'example.server.js')))
  }

  if (!fs.existsSync('package.json') || force) {
    console.log('Creating package.json')
    var serverPackageJson = {
      'name': 'jsreport-server',
      'dependencies': {
        'jsreport': packageJson.version + ''
      },
      'main': 'server.js'
    }
    fs.writeFileSync('package.json', JSON.stringify(serverPackageJson, null, 2))
  }

  if (!fs.existsSync('prod.config.json') || force) {
    console.log('Creating prod.config.json (applied on npm start --production)')
    fs.writeFileSync('prod.config.json', fs.readFileSync(path.join(__dirname, 'example.config.json')))
    console.log('Creating dev.config.json (applied on npm start)')
    fs.writeFileSync('dev.config.json', fs.readFileSync(path.join(__dirname, 'example.config.json')))
  }

  console.log('Initialized')
}

function init () {
  initializeApp(false)
}

function repair () {
  initializeApp(true)
}

var renderDefaults = {
  connectionString: {name: 'memory'},
  dataDirectory: path.join(__dirname, '../../', 'data'),
  blobStorage: 'inMemory',
  cacheAvailableExtensions: true,
  logger: {providerName: 'dummy'},
  rootDirectory: path.join(__dirname, '../../'),
  extensions: ['templates', 'data',  'jsrender', 'handlebars', 'fop-pdf',  'jsrender', 'scripts', 'text']
}

function ensureTempFolder () {
  if (renderDefaults.tempDirectory) {
    return
  }

  renderDefaults.tempDirectory = path.join(require('os').tmpdir(), 'jsreport')

  try {
    fs.mkdirSync(renderDefaults.tempDirectory)
  } catch (e) {
    if (e.code !== 'EEXIST') throw e
  }
}

function render (req) {
  if (_.isString(req)) {
    req = {
      template: {content: req, engine: 'handlebars', recipe: 'phantom-pdf'}
    }
  }

  if (!core.Reporter.instance) {
    ensureTempFolder()
    renderDefaults.parentModuleDirectory = renderDefaults.parentModuleDirectory || path.dirname(module.parent.filename)

    return main(renderDefaults).init().then(function () {
      return core.Reporter.instance.render(req)
    })
  }

  return core.Reporter.instance.render(req)
}

function extendDefaults (config) {
  return extend(true, renderDefaults, config)
}

if (require.main === module) {
  // jsreport commandline support can precreate app...

  require('commander')
    .version(packageJson.version)
    .usage('[options]')
    .option('-i, --init', 'Initialize server.js, config.json and package.json of application and starts it. For windows also installs service.', init)
    .option('-r, --repair', 'Recreate server.js, config.json and package.json of application to default.', repair)
    .parse(process.argv)
} else {
  module.exports = function (options) {
    options = options || {}
    options.parentModuleDirectory = path.dirname(module.parent.filename)
    return main(options)
  }
  module.exports.Reporter = core.Reporter
  module.exports.renderDefaults = renderDefaults
  module.exports.render = render
  module.exports.extendDefaults = extendDefaults
  module.exports.reporter = core.Reporter.instance
  module.exports.core = core
}
