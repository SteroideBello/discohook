import React from "react"
import {
  anyScopeRegex,
  ASTNode,
  defaultRules,
  inlineRegex,
  outputFor,
  parserFor,
  Rules,
} from "simple-markdown"
import CodeBlock from "./code/CodeBlock"
import { emojiToName, getEmojiUrl, nameToEmoji } from "./emoji"
import { Code, Emoji, Mention, Spoiler } from "./styles"

const emojiRegex = new RegExp(
  Object.keys(emojiToName)
    .join("|")
    .replace("*", "\\*"),
  // Asterisk emoji starts with an asterisk and must be escaped
  "g",
)

const baseRules: Rules = {
  escape: defaultRules.escape,
  link: {
    ...defaultRules.link,
    react: (node, output, state) => (
      <a
        href={node.target}
        title={node.title}
        rel="noopener noreferrer"
        target="_blank"
        key={state.key}
      >
        {output(node.content, state)}
      </a>
    ),
  },
  autolink: {
    ...defaultRules.autolink,
    match: anyScopeRegex(/^<(https?:\/\/[^ >]+)>/),
  },
  url: defaultRules.url,
  strong: defaultRules.strong,
  em: defaultRules.em,
  u: defaultRules.u,
  inlineCode: {
    ...defaultRules.inlineCode,
    react: (node, _output, state) => (
      <Code key={state.key}>{node.content}</Code>
    ),
  },
  shrug: {
    // Edge case for shrug emoji getting parsed as markup.
    order: defaultRules.text.order,
    match: inlineRegex(/^¯\\_\(ツ\)_\/¯/),
    parse: (capture, _parse, _state) => ({
      type: "text",
      content: capture[1],
    }),
  },
  emoji: {
    order: defaultRules.text.order,
    match: inlineRegex(/^:([^\s:]+?(?:::skin\-tone\-\d)?):/),
    parse: (capture, _parse, _state) =>
      nameToEmoji[capture[1]]
        ? {
            name: capture[1],
            surrogate: nameToEmoji[capture[1]],
            src: getEmojiUrl(nameToEmoji[capture[1]]),
          }
        : {
            type: "text",
            content: capture[0],
          },
    react: (node, _output, state) =>
      node.src ? (
        <Emoji
          src={node.src}
          alt={node.surrogate}
          title={node.name}
          draggable={false}
          big={node.jumboable}
          key={state.key}
        />
      ) : (
        <span key={state.key}>{node.surrogate}</span>
      ),
  },
  customEmoji: {
    order: defaultRules.text.order,
    match: inlineRegex(/^<a?:(\w+):(\d+)>/),
    parse: (capture, _parse, _state) => ({
      id: capture[2],
      name: `${capture[1]}`,
      src: `https://cdn.discordapp.com/emojis/${capture[2]}`,
    }),
    react: (node, _output, state) => (
      <Emoji
        src={node.src}
        alt={node.surrogate}
        title={node.name}
        draggable={false}
        big={node.jumboable}
        key={state.key}
      />
    ),
  },
  text: {
    ...defaultRules.text,
    parse: (capture, parse, state) =>
      state.nested
        ? {
            content: capture[0],
          }
        : parse(capture[0].replace(emojiRegex, e => `:${emojiToName[e]}:`), {
            ...state,
            nested: true,
          }),
  },
  del: {
    ...defaultRules.del,
    match: inlineRegex(/^~~([\s\S]+?)~~(?!_)/),
  },
  spoiler: {
    order: defaultRules.text.order,
    match: inlineRegex(/^\|\|([\s\S]+?)\|\|/),
    parse: (capture, parse, state) => ({
      content: parse(capture[1], state),
    }),
    react: (node, output, state) => (
      <Spoiler key={state.key}>{output(node.content, state)}</Spoiler>
    ),
  },
}

const inlineRules: Rules = {
  ...baseRules,
}

const blockRules: Rules = {
  ...baseRules,
  newline: defaultRules.newline,
  paragraph: defaultRules.paragraph,
  br: {
    ...defaultRules.br,
    match: anyScopeRegex(/^ *\n/),
  },
  codeBlock: {
    order: defaultRules.codeBlock.order,
    match: anyScopeRegex(/^```([a-z0-9\-]+?\n+)?\n*([^]+?)\n*```/),
    parse: (capture, _parse, _state) => ({
      language: (capture[1] || "").trim(),
      content: capture[2] || "",
    }),
    react: (node, _output, state) => (
      <CodeBlock
        key={state.key}
        language={node.language}
        content={node.content}
      />
    ),
  },
  mention: {
    order: defaultRules.text.order,
    match: inlineRegex(/^<@!?\d+>|^@(everyone|here)/),
    parse: (capture, _parse, _state) => ({
      content: capture[1] ? `@${capture[1]}` : "@unknown-user",
    }),
    react: (node, _output, state) => (
      <Mention key={state.key}>{node.content}</Mention>
    ),
  },
  roleMention: {
    order: defaultRules.text.order,
    match: inlineRegex(/^<@&\d+>/),
    parse: () => ({
      type: "mention",
      content: "@unknown-role",
    }),
  },
  channelMention: {
    order: defaultRules.text.order,
    match: inlineRegex(/^<#\d+>/),
    parse: () => ({
      type: "mention",
      content: "#unknown-channel",
    }),
  },
}

const parseInline = parserFor(inlineRules, { inline: true })
const parseBlock = parserFor(blockRules, { inline: true })
const reactOutput = outputFor({ ...inlineRules, ...blockRules }, "react")

const jumbosizeEmojis = (ast: ASTNode[]): ASTNode[] => {
  const isEmoji = (node: ASTNode) => /emoji|customEmoji/.test(node.type)
  const isNotEmoji = (node: ASTNode) => !isEmoji(node)

  // Gets all nodes of type 'emoji' or 'customEmoji'
  const emojiNodes = ast.filter(isNotEmoji)
  // If there's more than 26 (limit of jumbosized emojis), return the tree as is
  if (emojiNodes.length >= 26) return ast

  // Check if the tree has any amount of nodes that aren't emojis,
  // or nodes containing whitespace only
  const hasText = ast.some(node => {
    if (isEmoji(node)) return false
    if (typeof node.content !== "string") return true
    if (node.content.trim() !== "") return true
    return false
  })
  if (hasText) return ast

  // If the message passed all checks, return a copy of the tree where all nodes
  // have the 'jumboable' property set to true
  return ast.map(node => ({
    ...node,
    jumboable: true,
  }))
}

const ellipsize = (text: string, length: number) => {
  const shortenedText = text.replace(/\s+/g, " ")
  return shortenedText.length <= length
    ? shortenedText
    : shortenedText.substring(0, length) + "…"
}

const now = () =>
  typeof performance === "object" && performance.now ? performance.now() : 0

export const parseMarkup = (
  content: string,
  options: { inline?: boolean; jumboable?: boolean },
) => {
  const { inline = false, jumboable = false } = options || {}

  const startTime = now()

  const raw = inline ? parseInline(content) : parseBlock(content)
  const ast = jumboable ? jumbosizeEmojis(raw) : raw
  const parseTime = now() - startTime

  const output = reactOutput(ast)
  const outputTime = now() - startTime - parseTime

  const totalTime = parseTime + outputTime

  if (totalTime > 1) {
    const ellipsized = ellipsize(content, 10)
    const time = totalTime.toLocaleString("en-US")

    console.groupCollapsed(`Parsed markup for "${ellipsized}" in ${time}ms`)
    console.log("AST:", ast)
    if (content.includes("\n")) {
      console.log("Content:", "\n" + content)
    } else {
      console.log("Content:", content)
    }
    console.log("Inline:", inline)
    console.log("Parse time: ", parseTime, "\nOutput time:", outputTime)
    console.groupEnd()
  }

  return output
}
