var fs = require('fs');
var path = require('path');

var esprima = require('esprima');
var escodegen = require('escodegen');
var traverse = require('ast-traverse');

// Quick and dirty clone
var clone = function (obj) {
    return JSON.parse(JSON.stringify(obj));
};

var logCurrentLocNode = esprima.parse('console.log(\'Caught error at: line\', 1, \'column\', 1)').body[0];

var getNodeToInject = function () {
    return clone(logCurrentLocNode);
};

var injectFile = function (sourceFile) {
    var sourceBaseName = path.basename(sourceFile, '.js');
    var sourceMapFile = sourceBaseName + '.js.map';
    var injectedFile = sourceBaseName + '.injected.js';

    var sourcePath = path.join(__dirname, sourceFile);
    var source = fs.readFileSync(sourcePath);
    var tree = esprima.parse(source, {loc: true});

    

    traverse(tree, {
        post: function (node, parent, prop, idx) {
            if (node.type === 'CatchClause') {
                var nodeToInject = getNodeToInject();
                nodeToInject.expression.arguments[1].value = node.loc.start.line;
                nodeToInject.expression.arguments[3].value = node.loc.start.column;
                node.body.body.unshift(nodeToInject);
            }
        }
    });

    var sourceMapContent = escodegen.generate(tree, {sourceMap: sourceFile});
    var injectedSource = escodegen.generate(tree);

    fs.writeFileSync(path.join(__dirname, injectedFile), injectedSource + '\n//@ sourceMappingURL=' + sourceMapFile + '\n');
    fs.writeFileSync(path.join(__dirname, sourceMapFile), sourceMapContent);
};

injectFile('file.js');
