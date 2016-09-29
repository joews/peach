{

}

start
  = expression

expression
  = name
  / number
  / call

expression_list =
  head:expression tail:(__ e:expression { return e })* {
  return [head, ...tail];
}

call = lp name:name __ args:expression_list rp {
  return {
    type: "Call",
    name,
    args
  }
}

name = chars:[a-zA-Z]+ {
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
rp = _ ")" { return ")"}

// mandatory whitespace
__ = [ \t\r\n]+

// optional whitespace
_ = [ \t\r\n]*
