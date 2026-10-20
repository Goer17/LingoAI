import MarkdownIt from 'markdown-it';
/**
 * Chat Markdown renderer.
 *
 * Uses `markdown-it` (CommonMark) instead of the previous hand-rolled parser so
 * headings, nested ordered/unordered lists, tables, fenced code, blockquotes and
 * inline formatting all behave like real Markdown. Raw HTML is disabled, so
 * model output cannot inject markup; markdown-it's default link validator also
 * rejects `javascript:` and other unsafe protocols.
 *
 * `breaks` is enabled because chat replies often use single newlines where a
 * document would use blank lines — without it, consecutive bold lines collapse
 * into one paragraph.
 */
const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
    typographer: false,
});
const defaultLinkOpen = md.renderer.rules.link_open
    ?? ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));
md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noreferrer noopener');
    return defaultLinkOpen(tokens, index, options, env, self);
};
export function renderMarkdown(content) {
    if (!content) {
        return '';
    }
    return md.render(content);
}
