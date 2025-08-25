import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import SubPageComponent from './sub-page-component'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    subPage: {
      setSubPage: (options: { title: string; id?: string }) => ReturnType
    }
  }
}

export const SubPageExtension = Node.create({
  name: 'subPage',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      title: {
        default: 'Untitled Page',
      },
      pageId: {
        default: null,
      },
      emoji: {
        default: '📄',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="sub-page"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'sub-page' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(SubPageComponent)
  },

  addCommands() {
    return {
      setSubPage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})