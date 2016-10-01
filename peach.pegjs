start
  = _ program:expression_list _ { return program }

expression
  = def
  / fn
  / if
  / numeral
  / boolean
  / string
  / list
  / quoted
  / name

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

name = chars:[a-zA-Z+=*\/\-_<>]+ {
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

string = "`" tokens:string_token* "`" {
  return {
    type: "Str",
    value: tokens.join("")
  }
}

string_token
  = escape_sequence
  / [^`]

// \\ is a single literal backslash in JavaScript strings
escape_sequence
  = "\\\\" // escaped backslash
  / "\\`" // escaped string quote
  / "\\t" { return "\t" }
  / "\\n" { return "\n" }
  / "\\r" { return "\r" }
  // TODO other escape sequences:
  // unicode
  // hex
  // binary
  // the weird whitespace things that nobody uses like \b and \v ?

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
__ = ignored+

// optional whitespace
_ = ignored*

ignored
  = whitespace
  / comment

whitespace = [ \t\r\n,]

// One of the few places peach presents a syntactic choice
// I prefer the look of # but it is reasonable to support
//  classic Lisp-style ; commnets
comment = comment_leader [^\n]+
comment_leader = "#" / ";"
