function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child => 
        typeof child === "object"
          ? child
          : createTextElement(child)
      ),
    },
  }
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: []
    }
  }
}

function render(element, container) {
  const dom = 
    element.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createTextElement(element.type)
  
  const isProperty = key => key !== "children"

  // check properties without children
  // the properties are the attribute of the element(children is about childrens' info)
  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element.props[name]
    })
  
  // check recursively
  element.props.children.forEach(child =>
    render(child, dom)
  )

  container.appendChild(dom)
}

const Didact = {
  createElement,
}

const element = Didact.createElement(
  "div",
  { id: "foo" },
  Didact.createElement("a", null, "bar"),
  Didact.createElement("b")
)

const container = document.getElementById("root")
ReactDOM.render(element, container)
