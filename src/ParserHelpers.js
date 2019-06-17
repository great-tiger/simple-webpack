const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const ParserHelpers = exports;

/**
 * identifier 比如
 * require
 */
ParserHelpers.evaluateToIdentifier = function(identifier, truthy) {
	return function identifierExpression(expr) {
		let evex = new BasicEvaluatedExpression().setIdentifier(identifier).setRange(expr.range);
		if(truthy === true) evex = evex.setTruthy();
		else if(truthy === false) evex = evex.setFalsy();
		return evex;
	};
};