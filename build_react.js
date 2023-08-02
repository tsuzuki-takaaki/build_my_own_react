// Translate JSX into JavaScript object
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child => typeof child === "object" ? child : createTextElement(child))
    }
  };
}
function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: []
    }
  };
}
function createDom(fiber) {
  const dom = fiber.type == "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(fiber.type);
  const isProperty = key => key !== "children";
  Object.keys(fiber.props).filter(isProperty).forEach(name => {
    dom[name] = fiber.props[name];
  });
  return dom;
}
function render(element, container) {
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element]
    }
  };
}
let nextUnitOfWork = null;

// Scheduler for browser rendering
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  requestIdleCallback(workLoop);
}
requestIdleCallback(workLoop);

// 1. add the element to the DOM
// 2. create the fibers for the element’s children
// 3. select the next unit of work
function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // When the fiber is child[Parent-child]
  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom);
  }
  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;

  // Handle fibers with parent-child relation
  while (index < elements.length) {
    const element = elements[index];
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null
    };
    if (index === 0) {
      // Create linked list[Parent-Child]
      fiber.child = newFiber;
    } else {
      // Create linked list[Sibling-Sibling]
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }

  // When the fiber is parent[Parent-Child]
  // The child fiber will be nextUnitOfWork
  if (fiber.child) {
    return fiber.child;
  }

  // Ending search
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    // When sibling is not existing, go searching up throug 
    // If reaching root, nextFiber will be null and break this loop
    nextFiber = nextFiber.parent;
  }
}
const Didact = {
  createElement,
  render
};

// *********** Content ***********

/** @jsx Didact.createElement */
const element = Didact.createElement("div", {
  style: "background: salmon"
}, Didact.createElement("h1", null, "Hello World"), Didact.createElement("h2", {
  style: "text-align:right"
}, "from Didact"));

// *********** /Content ***********

const container = document.getElementById("root");
// element: { type: 'tag_name', props: { 'attribute_name': any, children: [ self ]}}
Didact.render(element, container);
