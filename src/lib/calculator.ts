// The navbar calculator's arithmetic: + − × ÷ and brackets, with the usual
// precedence. Read by hand rather than eval()'d, so anything else is just "no
// answer yet" — which is also what a half-typed "500 +" is.
export function evaluate(input: string): number | undefined {
  const src = input
    .replace(/[\s,₹]/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");
  let pos = 0;

  const expr = (): number => {
    let value = term();
    while (src[pos] === "+" || src[pos] === "-") {
      value = src[pos++] === "+" ? value + term() : value - term();
    }
    return value;
  };

  const term = (): number => {
    let value = factor();
    while (src[pos] === "*" || src[pos] === "/") {
      value = src[pos++] === "*" ? value * factor() : value / factor();
    }
    return value;
  };

  const factor = (): number => {
    if (src[pos] === "-") {
      pos++;
      return -factor();
    }
    if (src[pos] === "+") {
      pos++;
      return factor();
    }
    if (src[pos] === "(") {
      pos++;
      const value = expr();
      if (src[pos++] !== ")") throw new Error("Unclosed bracket");
      return value;
    }
    const number = /^\d+\.?\d*|^\.\d+/.exec(src.slice(pos));
    if (!number) throw new Error("Expected a number");
    pos += number[0].length;
    return Number(number[0]);
  };

  if (!src) return undefined;
  try {
    const value = expr();
    // Leftovers mean it did not all parse; ÷ 0 is no answer either.
    return pos === src.length && Number.isFinite(value) ? value : undefined;
  } catch {
    return undefined;
  }
}
