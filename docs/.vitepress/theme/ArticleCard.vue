<script setup lang="ts">
defineProps<{
  title: string
  date: string
  categories: string[]
  link: string
}>()
</script>

<template>
  <article class="article-card">
    <header class="article-header">
      <div class="article-meta">
        <time class="article-date">{{ date }}</time>
        <div class="article-categories">
          <span v-for="cat in categories" :key="cat" class="category-tag">
            {{ cat }}
          </span>
        </div>
      </div>
      <h2 class="article-title">
        <a :href="link" target="_blank" rel="noopener">{{ title }}</a>
      </h2>
    </header>
    <div class="article-content">
      <slot />
    </div>
    <footer class="article-footer">
      <a :href="link" target="_blank" rel="noopener" class="read-more">
        <span>AWS公式記事を見る</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 17L17 7M17 7H7M17 7V17"/>
        </svg>
      </a>
    </footer>
  </article>
</template>

<style scoped>
.article-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  margin: 32px 0;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.article-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--aws-amber-500, #f59e0b), var(--aws-orange-500, #ff6b35));
  border-radius: 12px 12px 0 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.article-card:hover {
  border-color: var(--aws-amber-500, #f59e0b);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.article-card:hover::before {
  opacity: 1;
}

.article-header {
  margin-bottom: 20px;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.article-date {
  font-family: var(--font-mono, monospace);
  font-size: 0.8125rem;
  color: var(--aws-amber-500, #f59e0b);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.article-categories {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-tag {
  font-family: var(--font-mono, monospace);
  font-size: 0.6875rem;
  padding: 4px 10px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.article-title {
  font-family: var(--font-mono, monospace);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
  margin: 0;
  border: none !important;
  padding: 0 !important;
}

.article-title a {
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: color 0.2s ease;
}

.article-title a:hover {
  color: var(--aws-amber-500, #f59e0b);
}

.article-content {
  font-size: 0.9375rem;
  line-height: 1.7;
}

.article-content :deep(h3) {
  font-family: var(--font-mono, monospace);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--aws-amber-500, #f59e0b);
  margin-top: 24px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none !important;
}

.article-content :deep(h3)::before {
  content: '▶';
  font-size: 0.625rem;
}

.article-content :deep(p) {
  margin: 12px 0;
}

.article-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--vp-c-divider);
}

.read-more {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono, monospace);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--aws-amber-500, #f59e0b);
  text-decoration: none;
  transition: all 0.2s ease;
}

.read-more:hover {
  color: var(--aws-orange-500, #ff6b35);
}

.read-more svg {
  transition: transform 0.2s ease;
}

.read-more:hover svg {
  transform: translate(2px, -2px);
}
</style>
