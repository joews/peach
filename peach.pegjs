{

}

start
  = _ program:expression_list _ { return program }

expression
  = name
  / numeral
  / def
  / list
  / quoted

expression_list =
  head:expression tail:(__ e:expression { return e })* {
  return [head, ...tail];
}

def = lp "def" __ name_exp:name __ value:expression rp {
  return {
    type: "Def",
    name: name_exp.name,
    value
  }
}

name = chars:[a-zA-Z+=*\/\-_]+ {
  return {
    type: "Name",
    name: chars.join("")
  }
}

numeral = digits:[0-9]+ {
  return {
    type: "Numeral",
    value: parseInt(digits, 10)
  };
}

list = lp values:expression_list rp {
  return {
    type: "List",
    values
  }
}

quoted = "'" expr:expression {
  return Object.assign(expr, { isQuoted: true })
}

lp = "(" _ { return "(" }
rp = _ ")" { return ")" }

// mandatory whitespace
__ = [ \t\r\n]+

// optional whitespace
_ = [ \t\r\n]*
