class BasicEvaluatedExpression {
  constructor() {
		this.range = null;
  }

	isNull() {
		return !!this.null;
	}

	isString() {
		return Object.prototype.hasOwnProperty.call(this, "string");
	}

	isNumber() {
		return Object.prototype.hasOwnProperty.call(this, "number");
	}

	isBoolean() {
		return Object.prototype.hasOwnProperty.call(this, "bool");
	}

	isRegExp() {
		return Object.prototype.hasOwnProperty.call(this, "regExp");
	}

  isIdentifier() {
		return Object.prototype.hasOwnProperty.call(this, "identifier");
	}

	setString(str) {
		if(str === null)
			delete this.string;
		else
			this.string = str;
		return this;
	}

	setNull() {
		this.null = true;
		return this;
	}

	setNumber(num) {
		if(num === null)
			delete this.number;
		else
			this.number = num;
		return this;
	}

	setBoolean(bool) {
		if(bool === null)
			delete this.bool;
		else
			this.bool = bool;
		return this;
	}

	setRegExp(regExp) {
		if(regExp === null)
			delete this.regExp;
		else
			this.regExp = regExp;
		return this;
	}

  setIdentifier(identifier) {
		if(identifier === null)
			delete this.identifier;
		else
			this.identifier = identifier;
		return this;
  }
    
  setTruthy() {
		this.falsy = false;
		this.truthy = true;
		return this;
	}

	setFalsy() {
		this.falsy = true;
		this.truthy = false;
		return this;
  }
    
  setRange(range) {
		this.range = range;
		return this;
	}
}

module.exports = BasicEvaluatedExpression;