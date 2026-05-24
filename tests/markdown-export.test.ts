import test from "node:test";
import assert from "node:assert/strict";
import {
  editorHtmlToMarkdown,
  editorHtmlToMarkdownBundle,
  isLocalMediaSource,
} from "../src/features/editor/lib/markdown";

class TestNode {
  static readonly TEXT_NODE = 3;

  childNodes: TestNode[];
  nodeType: number;
  parentNode: TestElement | null;
  textContent: string | null;

  constructor(nodeType: number, textContent: string | null = null) {
    this.childNodes = [];
    this.nodeType = nodeType;
    this.parentNode = null;
    this.textContent = textContent;
  }
}

class TestTextNode extends TestNode {
  constructor(textContent: string) {
    super(TestNode.TEXT_NODE, textContent);
  }
}

class TestElement extends TestNode {
  attributes: Map<string, string>;
  classList: string[];
  tagName: string;

  constructor(tagName: string, attributes: Record<string, string> = {}, children: TestNode[] = []) {
    super(1, null);
    this.attributes = new Map(Object.entries(attributes));
    this.classList = [];
    this.tagName = tagName.toUpperCase();
    this.replaceChildren(...children);
  }

  get children() {
    return this.childNodes.filter((child): child is TestElement => child instanceof TestElement);
  }

  get innerHTML() {
    return this.childNodes.map((child) => serializeNode(child)).join("");
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  querySelector(selector: string) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string) {
    const tagName = selector.toUpperCase();
    const matches: TestElement[] = [];

    const visit = (node: TestNode) => {
      if (!(node instanceof TestElement)) {
        return;
      }

      if (node.tagName === tagName) {
        matches.push(node);
      }

      for (const child of node.childNodes) {
        visit(child);
      }
    };

    for (const child of this.childNodes) {
      visit(child);
    }

    return matches;
  }

  replaceChildren(...children: TestNode[]) {
    this.childNodes = children;

    for (const child of this.childNodes) {
      child.parentNode = this;
    }
  }
}

class TestDOMParser {
  parseFromString(html: string) {
    return {
      body: parseHtmlBody(html),
    };
  }
}

function parseHtmlBody(html: string) {
  const body = new TestElement("body");
  const trimmed = html.trim();

  if (!trimmed) {
    return body;
  }

  const imageMatch = trimmed.match(/^<img\s+([^>]+?)\s*\/?>$/i);

  if (imageMatch) {
    body.replaceChildren(new TestElement("img", parseAttributes(imageMatch[1] ?? "")));
    return body;
  }

  const headingMatch = trimmed.match(/^<(h[1-6])>(.*?)<\/\1>$/i);

  if (headingMatch) {
    body.replaceChildren(new TestElement(headingMatch[1] ?? "h1", {}, [
      new TestTextNode(headingMatch[2] ?? ""),
    ]));
    return body;
  }

  throw new Error(`Test DOMParser does not support HTML: ${html}`);
}

function parseAttributes(input: string) {
  const attributes: Record<string, string> = {};

  for (const match of input.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)="([^"]*)"/g)) {
    attributes[match[1] ?? ""] = match[2] ?? "";
  }

  return attributes;
}

function serializeNode(node: TestNode): string {
  if (node instanceof TestTextNode) {
    return node.textContent ?? "";
  }

  if (node instanceof TestElement) {
    const attributes = Array.from(node.attributes.entries())
      .map(([name, value]) => ` ${name}="${value}"`)
      .join("");

    if (node.tagName === "IMG") {
      return `<img${attributes}>`;
    }

    return `<${node.tagName.toLowerCase()}${attributes}>${node.innerHTML}</${node.tagName.toLowerCase()}>`;
  }

  return "";
}

test("treats both relative and absolute api media URLs as local media", () => {
  assert.equal(isLocalMediaSource("/api/media/example.png"), true);
  assert.equal(
    isLocalMediaSource("http://127.0.0.1:3000/api/media/example.png"),
    true,
  );
});

test("exports level five and six headings to markdown", () => {
  const originalDOMParser = globalThis.DOMParser;
  const originalHTMLElement = globalThis.HTMLElement;
  const originalNode = globalThis.Node;

  globalThis.DOMParser = TestDOMParser as typeof DOMParser;
  globalThis.HTMLElement = TestElement as unknown as typeof HTMLElement;
  globalThis.Node = TestNode as unknown as typeof Node;

  try {
    assert.equal(editorHtmlToMarkdown("<h5>Details</h5>"), "##### Details");
    assert.equal(editorHtmlToMarkdown("<h6>More</h6>"), "###### More");
  } finally {
    globalThis.DOMParser = originalDOMParser;
    globalThis.HTMLElement = originalHTMLElement;
    globalThis.Node = originalNode;
  }
});

test("exports links and strikethrough to markdown", () => {
  const originalDOMParser = globalThis.DOMParser;
  const originalHTMLElement = globalThis.HTMLElement;
  const originalNode = globalThis.Node;

  class InlineTestDOMParser {
    parseFromString(html: string) {
      assert.equal(html, '<p><a href="https://example.com">北京文旅</a> <s>旧计划</s></p>');

      return {
        body: new TestElement("body", {}, [
          new TestElement("p", {}, [
            new TestElement("a", { href: "https://example.com" }, [
              new TestTextNode("北京文旅"),
            ]),
            new TestTextNode(" "),
            new TestElement("s", {}, [new TestTextNode("旧计划")]),
          ]),
        ]),
      };
    }
  }

  globalThis.DOMParser = InlineTestDOMParser as typeof DOMParser;
  globalThis.HTMLElement = TestElement as unknown as typeof HTMLElement;
  globalThis.Node = TestNode as unknown as typeof Node;

  try {
    assert.equal(
      editorHtmlToMarkdown('<p><a href="https://example.com">北京文旅</a> <s>旧计划</s></p>'),
      "[北京文旅](https://example.com) ~~旧计划~~",
    );
  } finally {
    globalThis.DOMParser = originalDOMParser;
    globalThis.HTMLElement = originalHTMLElement;
    globalThis.Node = originalNode;
  }
});

test("exports footnote references and definitions to markdown", () => {
  const originalDOMParser = globalThis.DOMParser;
  const originalHTMLElement = globalThis.HTMLElement;
  const originalNode = globalThis.Node;

  class FootnoteDOMParser {
    parseFromString() {
      return {
        body: new TestElement("body", {}, [
          new TestElement("p", {}, [
            new TestTextNode("北京"),
            new TestElement("a", { href: "#footnote-1" }, [new TestTextNode("[^1]")]),
          ]),
          new TestElement("p", {}, [
            new TestElement("a", { href: "#footnote-1" }, [new TestTextNode("[^1]")]),
            new TestTextNode(": 脚注内容"),
          ]),
        ]),
      };
    }
  }

  globalThis.DOMParser = FootnoteDOMParser as typeof DOMParser;
  globalThis.HTMLElement = TestElement as unknown as typeof HTMLElement;
  globalThis.Node = TestNode as unknown as typeof Node;

  try {
    assert.equal(
      editorHtmlToMarkdown("<ignored>"),
      "北京[^1]\n\n[^1]: 脚注内容",
    );
  } finally {
    globalThis.DOMParser = originalDOMParser;
    globalThis.HTMLElement = originalHTMLElement;
    globalThis.Node = originalNode;
  }
});

test("exports absolute api media URLs into markdown zip assets", async () => {
  const originalFetch = globalThis.fetch;
  const originalDOMParser = globalThis.DOMParser;
  const originalHTMLElement = globalThis.HTMLElement;
  const originalNode = globalThis.Node;
  const pngBytes = Uint8Array.from([137, 80, 78, 71]);

  globalThis.fetch = async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    assert.equal(url, "http://127.0.0.1:3000/api/media/example.png");

    return new Response(new Blob([pngBytes], { type: "image/png" }), {
      status: 200,
    });
  };
  globalThis.DOMParser = TestDOMParser as typeof DOMParser;
  globalThis.HTMLElement = TestElement as unknown as typeof HTMLElement;
  globalThis.Node = TestNode as unknown as typeof Node;

  try {
    const { assets, markdown } = await editorHtmlToMarkdownBundle(
      '<img alt="Example" src="http://127.0.0.1:3000/api/media/example.png">',
    );

    assert.equal(markdown, "![Example](assets/image-1.png)");
    assert.equal(assets.length, 1);
    assert.equal(assets[0]?.path, "assets/image-1.png");
    assert.equal(assets[0]?.mimeType, "image/png");
    assert.deepEqual(Array.from(assets[0]?.data ?? []), Array.from(pngBytes));
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.DOMParser = originalDOMParser;
    globalThis.HTMLElement = originalHTMLElement;
    globalThis.Node = originalNode;
  }
});
