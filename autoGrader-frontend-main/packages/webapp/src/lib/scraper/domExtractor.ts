/**
 * DOM Extractor
 * Advanced DOM tree extraction and analysis
 */

export interface DOMNode {
  tag: string;
  id?: string;
  classes?: string[];
  attributes?: Record<string, string>;
  text?: string;
  children?: DOMNode[];
  xpath?: string;
  cssPath?: string;
  depth: number;
  index: number;
}

export interface DOMExtractionResult {
  tree: DOMNode;
  statistics: {
    totalNodes: number;
    totalElements: number;
    totalTextNodes: number;
    maxDepth: number;
    tagCounts: Record<string, number>;
    classCounts: Record<string, number>;
    idCounts: Record<string, number>;
  };
  structure: {
    headings: Array<{ level: string; text: string; xpath: string }>;
    links: Array<{ href: string; text: string; xpath: string }>;
    images: Array<{ src: string; alt: string; xpath: string }>;
    forms: Array<{ action: string; method: string; inputs: number }>;
    tables: Array<{ rows: number; cols: number; xpath: string }>;
  };
}

export class DOMExtractor {
  private nodeIndex = 0;

  /**
   * Extract complete DOM tree
   */
  extractDOM(rootElement: Element, options?: {
    maxDepth?: number;
    includeText?: boolean;
    includeAttributes?: boolean;
    includePaths?: boolean;
  }): DOMExtractionResult {
    this.nodeIndex = 0;
    const opts = {
      maxDepth: options?.maxDepth || Infinity,
      includeText: options?.includeText !== false,
      includeAttributes: options?.includeAttributes !== false,
      includePaths: options?.includePaths !== false,
    };

    const tree = this.extractNode(rootElement, 0, opts);
    const statistics = this.calculateStatistics(tree);
    const structure = this.extractStructure(rootElement);

    return {
      tree,
      statistics,
      structure,
    };
  }

  /**
   * Extract single node
   */
  private extractNode(
    element: Element,
    depth: number,
    options: any,
    parentPath: string = ''
  ): DOMNode {
    const node: DOMNode = {
      tag: element.tagName.toLowerCase(),
      depth,
      index: this.nodeIndex++,
    };

    // ID
    if (element.id) {
      node.id = element.id;
    }

    // Classes
    if (element.classList.length > 0) {
      node.classes = Array.from(element.classList);
    }

    // Attributes
    if (options.includeAttributes && element.attributes.length > 0) {
      node.attributes = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        if (attr.name !== 'class' && attr.name !== 'id') {
          node.attributes[attr.name] = attr.value;
        }
      }
    }

    // Text content (direct text only, not from children)
    if (options.includeText) {
      const directText = Array.from(element.childNodes)
        .filter(child => child.nodeType === Node.TEXT_NODE)
        .map(child => child.textContent?.trim())
        .filter(text => text && text.length > 0)
        .join(' ');
      
      if (directText) {
        node.text = directText;
      }
    }

    // Paths
    if (options.includePaths) {
      node.xpath = this.getXPath(element);
      node.cssPath = this.getCSSPath(element);
    }

    // Children
    if (depth < options.maxDepth) {
      const children: DOMNode[] = [];
      for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i];
        children.push(this.extractNode(child, depth + 1, options, node.cssPath || ''));
      }
      if (children.length > 0) {
        node.children = children;
      }
    }

    return node;
  }

  /**
   * Calculate DOM statistics
   */
  private calculateStatistics(tree: DOMNode): DOMExtractionResult['statistics'] {
    const stats = {
      totalNodes: 0,
      totalElements: 0,
      totalTextNodes: 0,
      maxDepth: 0,
      tagCounts: {} as Record<string, number>,
      classCounts: {} as Record<string, number>,
      idCounts: {} as Record<string, number>,
    };

    const traverse = (node: DOMNode) => {
      stats.totalNodes++;
      stats.totalElements++;
      stats.maxDepth = Math.max(stats.maxDepth, node.depth);

      // Count tags
      stats.tagCounts[node.tag] = (stats.tagCounts[node.tag] || 0) + 1;

      // Count classes
      if (node.classes) {
        node.classes.forEach(cls => {
          stats.classCounts[cls] = (stats.classCounts[cls] || 0) + 1;
        });
      }

      // Count IDs
      if (node.id) {
        stats.idCounts[node.id] = (stats.idCounts[node.id] || 0) + 1;
      }

      // Count text nodes
      if (node.text) {
        stats.totalTextNodes++;
      }

      // Traverse children
      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    traverse(tree);
    return stats;
  }

  /**
   * Extract page structure
   */
  private extractStructure(root: Element): DOMExtractionResult['structure'] {
    return {
      headings: this.extractHeadings(root),
      links: this.extractLinks(root),
      images: this.extractImages(root),
      forms: this.extractForms(root),
      tables: this.extractTables(root),
    };
  }

  /**
   * Extract headings
   */
  private extractHeadings(root: Element) {
    const headings: Array<{ level: string; text: string; xpath: string }> = [];
    const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    
    headingTags.forEach(tag => {
      const elements = root.querySelectorAll(tag);
      elements.forEach(el => {
        headings.push({
          level: tag,
          text: el.textContent?.trim() || '',
          xpath: this.getXPath(el),
        });
      });
    });

    return headings;
  }

  /**
   * Extract links
   */
  private extractLinks(root: Element) {
    const links: Array<{ href: string; text: string; xpath: string }> = [];
    const elements = root.querySelectorAll('a[href]');
    
    elements.forEach(el => {
      const href = el.getAttribute('href');
      if (href) {
        links.push({
          href,
          text: el.textContent?.trim() || '',
          xpath: this.getXPath(el),
        });
      }
    });

    return links;
  }

  /**
   * Extract images
   */
  private extractImages(root: Element) {
    const images: Array<{ src: string; alt: string; xpath: string }> = [];
    const elements = root.querySelectorAll('img[src]');
    
    elements.forEach(el => {
      const src = el.getAttribute('src');
      if (src) {
        images.push({
          src,
          alt: el.getAttribute('alt') || '',
          xpath: this.getXPath(el),
        });
      }
    });

    return images;
  }

  /**
   * Extract forms
   */
  private extractForms(root: Element) {
    const forms: Array<{ action: string; method: string; inputs: number }> = [];
    const elements = root.querySelectorAll('form');
    
    elements.forEach(el => {
      forms.push({
        action: el.getAttribute('action') || '',
        method: el.getAttribute('method') || 'get',
        inputs: el.querySelectorAll('input, textarea, select').length,
      });
    });

    return forms;
  }

  /**
   * Extract tables
   */
  private extractTables(root: Element) {
    const tables: Array<{ rows: number; cols: number; xpath: string }> = [];
    const elements = root.querySelectorAll('table');
    
    elements.forEach(el => {
      const rows = el.querySelectorAll('tr').length;
      const firstRow = el.querySelector('tr');
      const cols = firstRow ? firstRow.querySelectorAll('td, th').length : 0;
      
      tables.push({
        rows,
        cols,
        xpath: this.getXPath(el),
      });
    });

    return tables;
  }

  /**
   * Get XPath for element
   */
  private getXPath(element: Element): string {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    const parts: string[] = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 0;
      let sibling = current.previousElementSibling;

      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }

      const tagName = current.tagName.toLowerCase();
      const pathIndex = index > 0 ? `[${index + 1}]` : '';
      parts.unshift(`${tagName}${pathIndex}`);

      current = current.parentElement;
    }

    return '/' + parts.join('/');
  }

  /**
   * Get CSS Path for element
   */
  private getCSSPath(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }

    const parts: string[] = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();

      if (current.classList.length > 0) {
        selector += '.' + Array.from(current.classList).join('.');
      }

      parts.unshift(selector);

      if (current.parentElement?.children.length === 1) {
        current = current.parentElement;
      } else {
        break;
      }
    }

    return parts.join(' > ');
  }

  /**
   * Search DOM tree
   */
  searchDOM(tree: DOMNode, query: {
    tag?: string;
    id?: string;
    class?: string;
    text?: string;
    attribute?: { name: string; value: string };
  }): DOMNode[] {
    const results: DOMNode[] = [];

    const search = (node: DOMNode) => {
      let matches = true;

      if (query.tag && node.tag !== query.tag.toLowerCase()) {
        matches = false;
      }

      if (query.id && node.id !== query.id) {
        matches = false;
      }

      if (query.class && (!node.classes || !node.classes.includes(query.class))) {
        matches = false;
      }

      if (query.text && (!node.text || !node.text.includes(query.text))) {
        matches = false;
      }

      if (query.attribute && node.attributes) {
        const attrValue = node.attributes[query.attribute.name];
        if (attrValue !== query.attribute.value) {
          matches = false;
        }
      }

      if (matches) {
        results.push(node);
      }

      if (node.children) {
        node.children.forEach(search);
      }
    };

    search(tree);
    return results;
  }

  /**
   * Get node by path
   */
  getNodeByPath(tree: DOMNode, path: string): DOMNode | null {
    const parts = path.split(' > ').filter(p => p);
    let current: DOMNode | null = tree;

    for (const part of parts) {
      if (!current || !current.children) {
        return null;
      }

      const match = current.children.find(child => {
        if (part.startsWith('#')) {
          return child.id === part.substring(1);
        } else if (part.includes('.')) {
          const [tag, ...classes] = part.split('.');
          return child.tag === tag && classes.every(cls => child.classes?.includes(cls));
        } else {
          return child.tag === part;
        }
      });

      current = match || null;
    }

    return current;
  }
}
