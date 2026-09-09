<template>
  <div :class="['pokemon-row-card', { shadow: item.mine?.isShadow, expanded: isExpanded }]">
    <div class="row-header" @click="isExpanded = !isExpanded">
      <div class="rank-badge">#{{ item.meta.rank }}</div>

      <div class="score-container">
        <div class="score-bar-bg">
          <div
            class="score-bar-fill"
            :style="{ width: `${item.meta.score}%`, backgroundColor: primaryTypeColor }"
          ></div>
        </div>
        <span class="score-num">{{ item.meta.score }}</span>
      </div>

      <div class="name-info">
        <div class="name-line">
          <span class="pokemon-name">{{ item.meta.nameFr }}</span>
          <span v-if="item.mine?.isShadow" class="shadow-badge">Obscur</span>
          <span v-if="item.mine?.isLucky" class="lucky-badge">✨ Chanceux</span>
        </div>
        <div class="types-line">
          <span
            v-for="t in item.meta.types"
            :key="t"
            class="type-pill"
            :style="{ backgroundColor: getTypeColor(t) }"
          >
            {{ t }}
          </span>
        </div>
      </div>

      <div class="ownership-summary">
        <template v-if="item.mine">
          <span class="owned-tag">✅ Possédé</span>
          <span v-if="item.mine.ivRankPercent" class="iv-tag">
            IV: {{ item.mine.ivRankPercent.toFixed(1) }}%
            <span v-if="item.mine.ivRankNumber" class="rank-num">#{{ item.mine.ivRankNumber }}</span>
          </span>
          <span v-else-if="item.mine.ivAverage" class="iv-tag">
            IV Moy: {{ item.mine.ivAverage.toFixed(1) }}%
          </span>
        </template>
        <template v-else>
          <span class="not-owned-tag">❌ Non possédé</span>
        </template>
      </div>

      <div class="expand-icon">{{ isExpanded ? '▲' : '▼' }}</div>
    </div>

    <!-- Expanded view -->
    <div v-if="isExpanded" class="expanded-details">
      <div class="details-grid">
        <div v-if="item.mine" class="detail-section">
          <h4>MON POKÉMON</h4>
          <p>
            <strong>Spécimen :</strong> {{ item.mine.name }}
            <span v-if="item.mine.needsEvolution" class="evo-tag">(Évolution requise)</span>
          </p>
          <p><strong>PC :</strong> {{ item.mine.cp }} · <strong>Niveau :</strong> {{ item.mine.level }}</p>
          <p><strong>IV :</strong> {{ item.mine.atkIv }} / {{ item.mine.defIv }} / {{ item.mine.staIv }}</p>
          <p v-if="item.mine.dustCost > 0 || item.mine.candyCost > 0">
            <strong>Coût prévisionnel :</strong> {{ item.mine.dustCost.toLocaleString('fr-FR') }} poussières / {{ item.mine.candyCost }} bonbons
          </p>
        </div>

        <div class="detail-section">
          <h4>MOVES RECOMMANDÉS</h4>
          <p><strong>Rapide :</strong> ⚡ {{ item.meta.recommendedMoveset.fast }}</p>
          <p><strong>Chargées :</strong> 💥 {{ item.meta.recommendedMoveset.charged.join(' · ') }}</p>
        </div>

        <div class="detail-section">
          <h4>MATCHUPS CLÉS</h4>
          <p><strong>Victoires :</strong> {{ item.meta.matchups.map(m => m.opponentNameFr).join(', ') || 'N/A' }}</p>
          <p><strong>Contres :</strong> {{ item.meta.counters.map(c => c.opponentNameFr).join(', ') || 'N/A' }}</p>
        </div>
      </div>

      <div v-if="item.mine" class="expanded-actions">
        <button class="remove-btn" @click.stop="$emit('request-remove', item.mine.uniqueKey, item.mine.name)">
          Retirer de ma collection
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { TYPE_COLORS } from '../assets/type-colors.js';

const props = defineProps({
  item: { type: Object, required: true }
});
defineEmits(['request-remove']);

const isExpanded = ref(false);

function getTypeColor(type) {
  return TYPE_COLORS[type] || '#718096';
}

const primaryTypeColor = computed(() => {
  const t = props.item.meta.types?.[0];
  return getTypeColor(t);
});
</script>

<style scoped>
.pokemon-row-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
}
.pokemon-row-card.shadow {
  border-left: 4px solid #7C3AED;
}
.row-header {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  gap: 1rem;
}
.rank-badge {
  font-weight: 700;
  color: #718096;
  width: 36px;
  font-size: 0.9rem;
}
.score-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 140px;
}
.score-bar-bg {
  flex: 1;
  height: 8px;
  background: #E2E8F0;
  border-radius: 4px;
  overflow: hidden;
}
.score-bar-fill {
  height: 100%;
  border-radius: 4px;
}
.score-num {
  font-size: 0.85rem;
  font-weight: 700;
  width: 24px;
}
.name-info {
  flex: 1;
}
.name-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.pokemon-name {
  font-size: 1rem;
  font-weight: 600;
}
.shadow-badge {
  background: #7C3AED;
  color: white;
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 4px;
}
.lucky-badge {
  color: #D97706;
  font-size: 0.75rem;
  font-weight: 600;
}
.types-line {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.2rem;
}
.type-pill {
  font-size: 0.65rem;
  color: white;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}
.ownership-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 0.8rem;
  gap: 0.2rem;
}
.owned-tag {
  color: #059669;
  font-weight: 600;
}
.not-owned-tag {
  color: #94A3B8;
}
.iv-tag {
  color: #4B5563;
  font-size: 0.75rem;
}
.rank-num {
  font-weight: 600;
  color: #2563EB;
}
.expand-icon {
  font-size: 0.75rem;
  color: #94A3B8;
}
.expanded-details {
  padding: 1rem;
  border-top: 1px dashed #E2E8F0;
  background: #F8FAFC;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}
.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}
.detail-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.75rem;
  color: #64748B;
  text-transform: uppercase;
}
.detail-section p {
  margin: 0.25rem 0;
  font-size: 0.85rem;
}
.evo-tag {
  color: #D97706;
  font-size: 0.75rem;
}
.expanded-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}
.remove-btn {
  background: #FEE2E2;
  color: #DC2626;
  border: 1px solid #FCA5A5;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s;
}
.remove-btn:hover {
  background: #FECACA;
}
</style>
