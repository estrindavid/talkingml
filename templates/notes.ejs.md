```{=html}
<div class="notes-list-shell" data-listing-state="<%= items.length === 0 ? 'empty' : 'ready' %>">
<% if (items.length === 0) { %>
  <section class="notes-empty" data-empty-listing aria-labelledby="empty-notes-title">
    <span class="notes-empty-mark" aria-hidden="true"></span>
    <p class="notes-empty-kicker">Notebook open</p>
    <h2 id="empty-notes-title">The first proper note is still being written.</h2>
    <p>When it is ready, it will appear here.</p>
  </section>
<% } else { %>
  <ol class="notes-list list" aria-label="TalkingML notes">
  <% for (let index = 0; index < items.length; index += 1) { const item = items[index]; %>
    <li class="notes-list-item" <%= metadataAttrs(item) %>>
      <span class="note-number" aria-hidden="true"><%= String(index + 1).padStart(2, '0') %></span>
      <article class="note-summary">
        <% if (item.date) { %>
        <p class="note-meta"><span class="listing-date"><%- item.date %></span></p>
        <% } %>
        <h2><a class="listing-title" href="<%- item.path %>"><%- item.title %></a></h2>
        <% if (item.description) { %>
        <p class="listing-description"><%- item.description %></p>
        <% } %>
        <a class="note-read-link" href="<%- item.path %>">Read note <span aria-hidden="true">→</span></a>
      </article>
    </li>
  <% } %>
  </ol>
<% } %>
</div>
```
