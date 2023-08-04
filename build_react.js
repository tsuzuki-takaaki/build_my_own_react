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
  updateDom(dom, {}, fiber.props);
  return dom;
}
const isEvent = key => key.startsWith("on");
const isProperty = key => key !== "children" && !isEvent(key);
const isNew = (prev, next) => key => prev[key] !== next[key]; // Refs: https://cloudsmith.co.jp/blog/frontend/2021/09/1874653.html
const isGone = (prev, next) => key => !(key in next); // Detect property that only prev is having 
function updateDom(dom, prevProps, nextProps) {
  //Remove old or changed event listeners
  Object.keys(prevProps).filter(isEvent).filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key)).forEach(name => {
    const eventType = name.toLowerCase().substring(2);
    dom.removeEventListener(eventType, prevProps[name]);
  });

  // Remove old properties
  Object.keys(prevProps).filter(isProperty).filter(isGone(prevProps, nextProps)).forEach(name => {
    dom[name] = "";
  });

  // Add event listeners
  Object.keys(nextProps).filter(isEvent).filter(isNew(prevProps, nextProps)).forEach(name => {
    const eventType = name.toLowerCase().substring(2);
    dom.addEventListener(eventType, nextProps[name]);
  });

  // Set new or changed properties
  Object.keys(nextProps).filter(isProperty).filter(isNew(prevProps, nextProps)).forEach(name => {
    dom[name] = nextProps[name];
  });
}
function commitRoot() {
  // See wipRoot structure with console
  // console.log(wipRoot)
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}
function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  const domParent = fiber.parent.dom;
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "DELETION") {
    domParent.removeChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    },
    alternate: currentRoot
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}
let nextUnitOfWork = null;
let currentRoot = null;
let wipRoot = null;
let deletions = null;

// Scheduler for browser rendering
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}
requestIdleCallback(workLoop);

// add the element to the DOM
// select the next unit of work
function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  // wipRoot = {
  //   dom: container,
  //   props: {
  //     children: [element], <- ネストしているタグの配列
  //   },
  //   alternate: currentRoot,
  // }
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);

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

// create the fibers for the element’s children
// elements: wipFiber.props.children
function reconcileChildren(wipFiber, elements) {
  let index = 0;
  // if (wipFiber.alternate)
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;

  // Handle fibers with parent-child relation
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;
    const sameType = oldFiber && element && element.type == oldFiber.type;

    // Update the node
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE"
      };
    }

    // Add this node
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT"
      };
    }

    // Delete the oldFiber's node(See sameType definition)
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
    if (index === 0) {
      // Create linked list[Parent-Child]
      wipFiber.child = newFiber;
    } else if (element) {
      // Create linked list[Sibling-Sibling]
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
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
