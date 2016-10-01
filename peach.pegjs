{

}

start
  = _ program:expression_list _ { return program }

expression
  = numeral
  / boolean
  / name
  / def
  / list
  / quoted
  / fn
  / if
  / lp e:expression rp { return expression }

expression_list =
  head:expression tail:(__ e:expression { return e })* {
  return [head, ...tail];
}

expression_pair = first:expression __ second:expression {
  return [first, second];
}

expression_pair_list =
  head:expression_pair tail:(__ p:expression_pair { return p })* {
  return [head, ...tail];
}

def = lp "def" __ name_exp:name __ value:expression rp {
  return {
    type: "Def",
    name: name_exp.name,
    value
  }
}

fn = lp arg:name __ "=>" __ body:expression rp {
  return {
    type: "Fn",
    declaredArgs: [arg],
    body
  }
}

if = lp "?" __ clauses:expression_pair_list rp {
  return {
    type: "If",
    clauses
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
    value: parseInt(digits.join(""), 10)
  };
}

boolean = value:boolean_value {
  return {
    type: "Bool",
    value
  }
}

boolean_value
  = "true" { return true }
  / "false" { return false }

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
