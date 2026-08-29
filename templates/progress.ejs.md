```{=html}
<div class="archive-list" data-archive-state="<%= items.length === 0 ? 'empty' : 'ready' %>">
<% if (items.length === 0) { %>
  <section class="archive-empty" aria-labelledby="empty-progress-title">
    <p class="archive-empty-number" aria-hidden="true">00</p>
    <h2 id="empty-progress-title">Oops, there are no progress logs here yet :/</h2>
    <p>The first build log is still being prepared.</p>
  </section>
<% } else { %>
  <% for (let index = 0; index < items.length; index += 1) { const item = items[index]; %>
  <article class="archive-item" <%= metadataAttrs(item) %>>
    <span class="archive-item-number" aria-hidden="true"><%= String(index + 1).padStart(2, '0') %></span>
    <div class="archive-item-copy">
    <% if (item.date) { %>
      <p class="archive-item-date"><span class="listing-date"><%- item.date %></span></p>
    <% } %>
      <h2><a class="listing-title" href="<%- item.path %>"><%- item.title %></a></h2>
    <% if (item.description) { %>
      <p class="listing-description"><%- item.description %></p>
    <% } %>
      <a class="note-read-link" href="<%- item.path %>">Read article <span aria-hidden="true">→</span></a>
    </div>
  </article>
  <% } %>
<% } %>
</div>
```
