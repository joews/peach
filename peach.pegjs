{

}

start
  = _ program:expression_list _ { return program }

expression
  = name
  / number
  / def
  / call

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

call = lp name_exp:name __ args:expression_list rp {
  return {
    type: "Call",
    name: name_exp.name,
    args
  }
}

name = chars:[a-zA-Z+=*\/]+ {
  return {
    type: "Name",
    name: chars.join("")
  }
}

number = digits:[0-9]+ {
  return {
    type: "Number",
    value: parseInt(digits, 10)
  };
}

lp = "(" _ { return "(" }
rp = _ ")" { return ")" }

// mandatory whitespace
__ = [ \t\r\n]+

// optional whitespace
_ = [ \t\r\n]*
