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
  <% const recentItems = items.slice(0, 3); %>
  <section id="recent-articles" class="recent-carousel carousel slide" data-bs-ride="carousel" data-bs-interval="6000" data-bs-pause="hover" data-bs-touch="true" aria-label="Recent articles">
    <div class="carousel-indicators" aria-label="Choose a recent article">
    <% for (let index = 0; index < recentItems.length; index += 1) { %>
      <button type="button" data-bs-target="#recent-articles" data-bs-slide-to="<%= index %>" class="<%= index === 0 ? 'active' : '' %>" <%= index === 0 ? 'aria-current="true"' : '' %> aria-label="Show article <%= index + 1 %>"></button>
    <% } %>
    </div>
    <div class="carousel-inner">
    <% for (let index = 0; index < recentItems.length; index += 1) { const item = recentItems[index]; %>
      <div class="carousel-item<%= index === 0 ? ' active' : '' %>" <%= metadataAttrs(item) %>>
        <article class="recent-carousel-article">
          <span class="note-number" aria-hidden="true"><%= String(index + 1).padStart(2, '0') %></span>
          <div class="note-summary">
        <% if (item.date) { %>
            <p class="note-meta"><span class="listing-date"><%- item.date %></span></p>
        <% } %>
            <h2><a class="listing-title" href="<%- item.path %>"><%- item.title %></a></h2>
        <% if (item.description) { %>
            <p class="listing-description"><%- item.description %></p>
        <% } %>
            <a class="note-read-link" href="<%- item.path %>">Read article <span aria-hidden="true">→</span></a>
          </div>
        </article>
      </div>
    <% } %>
    </div>
    <% if (recentItems.length > 1) { %>
    <div class="recent-carousel-controls">
      <button class="carousel-control-prev" type="button" data-bs-target="#recent-articles" data-bs-slide="prev" title="Previous article">
        <span aria-hidden="true">←</span><span class="visually-hidden">Previous article</span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#recent-articles" data-bs-slide="next" title="Next article">
        <span aria-hidden="true">→</span><span class="visually-hidden">Next article</span>
      </button>
    </div>
    <% } %>
  </section>
<% } %>
</div>
```
