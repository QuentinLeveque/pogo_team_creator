<template>
  <div :class="['pokemon-row-card', { shadow: item.mine?.isShadow || item.meta?.isShadow, expanded: isExpanded }]">
    <div class="row-header" @click="isExpanded = !isExpanded">
      <div class="rank-badge">#{{ item.meta.rank }}</div>

      <div class="score-container">
        <span class="score-num">{{ item.meta.score }}</span>
      </div>

      <PokemonSprite
        :dex-number="item.mine?.dexNumber || item.meta.dexNumber"
        :alt="item.meta.nameFr"
      />

      <div class="name-info">
        <div class="name-line">
          <span class="pokemon-name">{{ item.meta.nameFr }}</span>
          <span v-if="item.mine?.form" class="form-badge">{{ item.mine.form }}</span>
          <span v-if="item.mine?.isShadow || item.meta?.isShadow" class="shadow-badge">Obscur</span>
          <span v-if="item.mine?.isLucky" class="lucky-badge">✨ Chanceux</span>
          <span v-if="item.mine?.needsEvolution" class="evo-badge">Évolution requise</span>
        </div>
        <div v-if="item.mine?.betterUnevolvedCandidate" class="better-unevolved-notice">
          💡 Non-évolué disponible : {{ item.mine.betterUnevolvedCandidate.name }} (Rang {{ item.mine.betterUnevolvedCandidate.ivRankPercent?.toFixed(1) }}%)
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
        <div v-if="!item.mine && item.meta.reverseEvolutionPath" class="reverse-evo-path">
          🌱 {{ item.meta.reverseEvolutionPath }}
        </div>
      </div>

      <div class="ownership-summary">
        <template v-if="item.mine">
          <div class="ownership-top">
            <span v-if="item.mine.ivRankPercent" class="rank-tag">
              Rang: {{ item.mine.ivRankPercent.toFixed(1) }}%
              <span v-if="item.mine.ivRankNumber" class="rank-num">#{{ item.mine.ivRankNumber }}</span>
            </span>
            <span v-else-if="item.mine.ivAverage" class="rank-tag">
              IV: {{ item.mine.ivAverage.toFixed(1) }}%
            </span>
          </div>

          <div v-if="item.mine.dustCost > 0 || item.mine.candyCost > 0 || item.mine.requiresXl" class="costs-line">
            <span v-if="item.mine.dustCost > 0" class="cost-pill dust">
              ✨ {{ item.mine.dustCost.toLocaleString('fr-FR') }}
            </span>
            <span v-if="item.mine.candyCost > 0" class="cost-pill candy">
              🍬 {{ item.mine.candyCost }}
            </span>
            <span v-if="item.mine.requiresXl" class="cost-pill xl">
              🔷 {{ item.mine.xlCandyCost }} XL
            </span>
          </div>
        </template>
        <template v-else>
          <span class="not-owned-tag">❌ Non possédé</span>
        </template>
      </div>

      <div class="expand-icon">{{ isExpanded ? '▲' : '▼' }}</div>
    </div>

    <!-- Expanded view -->
    <div v-if="isExpanded" class="expanded-details">
      <!-- Visual Evolution Line -->
      <div
        v-if="item.meta.evolutionLine && item.meta.evolutionLine.length > 1"
        class="evolution-chain-section"
      >
        <h4>Lignée d'évolution</h4>
        <div class="evolution-stages-track">
          <template v-for="(stage, idx) in item.meta.evolutionLine" :key="stage.speciesId">
            <div :class="['stage-card', { 'is-target': stage.isTarget, 'is-owned': stage.isOwned }]">
              <PokemonSprite :dex-number="stage.dexNumber" :alt="stage.nameFr" class="stage-sprite" />
              <div class="stage-info">
                <div class="stage-name-line">
                  <span class="stage-name">{{ stage.nameFr }}</span>
                  <span v-if="stage.isTarget" class="badge-target">🎯 Cible</span>
                </div>
                <span v-if="stage.isOwned && stage.ownedCandidate" class="badge-owned">
                  ✅ En stock ({{ stage.ownedCandidate.ivRankPercent ? `Rang ${stage.ownedCandidate.ivRankPercent.toFixed(1)}%${stage.ownedCandidate.ivRankNumber ? ` #${stage.ownedCandidate.ivRankNumber}` : ''}` : `IV ${stage.ownedCandidate.ivAverage?.toFixed(1)}%` }})
                </span>
                <span v-else-if="stage.isOwned" class="badge-owned">
                  ✅ En stock
                </span>
                <span v-else class="badge-missing">❌ Non possédé</span>
              </div>
            </div>
            <span v-if="idx < item.meta.evolutionLine.length - 1" class="stage-arrow">➔</span>
          </template>
        </div>
      </div>

      <!-- Side-by-side comparison if better unevolved candidate exists -->
      <div v-if="item.mine?.betterUnevolvedCandidate" class="comparison-section">
        <h4>Arbitrage : Spécimen Actuel vs Candidat Supérieur</h4>
        <div class="comparison-grid">
          <div class="comparison-card current">
            <div class="comp-header">
              <span class="comp-badge active">Actuel (Prêt à jouer)</span>
            </div>
            <div class="comp-name">{{ item.mine.name }}</div>
            <div class="comp-metric">
              Rang : <strong>{{ item.mine.ivRankPercent ? `${item.mine.ivRankPercent.toFixed(1)}% #${item.mine.ivRankNumber}` : `${item.mine.ivAverage.toFixed(1)}%` }}</strong>
            </div>
            <div class="comp-cost">
              Coût : ✨ {{ (item.mine.dustCost || 0).toLocaleString('fr-FR') }} · 🍬 {{ item.mine.candyCost || 0 }}
              <span v-if="item.mine.requiresXl"> · 🔷 {{ item.mine.xlCandyCost }} XL</span>
            </div>
          </div>

          <div class="comparison-card candidate">
            <div class="comp-header">
              <span class="comp-badge potential">Potentiel supérieur</span>
            </div>
            <div class="comp-name">{{ item.mine.betterUnevolvedCandidate.name }}</div>
            <div class="comp-metric">
              Rang supérieur : <strong>{{ item.mine.betterUnevolvedCandidate.ivRankPercent?.toFixed(1) }}% #{{ item.mine.betterUnevolvedCandidate.ivRankNumber }}</strong>
            </div>
            <div class="comp-cost">
              Coût d'évolution & boost : ✨ {{ (item.mine.betterUnevolvedCandidate.dustCost || 0).toLocaleString('fr-FR') }} · 🍬 {{ item.mine.betterUnevolvedCandidate.candyCost || 0 }}
              <span v-if="item.mine.betterUnevolvedCandidate.xlCandyCost > 0"> · 🔷 {{ item.mine.betterUnevolvedCandidate.xlCandyCost }} XL</span>
            </div>
          </div>
        </div>
      </div>

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
            <span v-if="item.mine.requiresXl"> / {{ item.mine.xlCandyCost }} XL</span>
          </p>
        </div>

        <div class="detail-section moves-section">
          <h4>ATTAQUES</h4>
          <div class="moves-comparison-grid">
            <div class="moves-col">
              <div class="moves-col-header">Recommandées (PvPoke)</div>
              <div class="moves-list">
                <div v-if="item.meta.recommendedMoveset.fast" class="move-badge-item">
                  <span class="move-icon">⚡</span>
                  <span class="move-name">{{ item.meta.recommendedMoveset.fast.nameFr || item.meta.recommendedMoveset.fast }}</span>
                  <span v-if="item.meta.recommendedMoveset.fast.isElite" class="elite-pill">⭐ Élite</span>
                </div>
                <div
                  v-for="cm in (Array.isArray(item.meta.recommendedMoveset.charged) ? item.meta.recommendedMoveset.charged : [])"
                  :key="cm.moveId || cm"
                  class="move-badge-item"
                >
                  <span class="move-icon">💥</span>
                  <span class="move-name">{{ cm.nameFr || cm }}</span>
                  <span v-if="cm.isElite" class="elite-pill">⭐ Élite</span>
                </div>
              </div>
            </div>

            <div class="moves-col">
              <div class="moves-col-header">Actuelles de mon Pokémon</div>
              <div v-if="item.mine" class="moves-list">
                <div class="move-badge-item">
                  <span class="move-icon">⚡</span>
                  <span class="move-name">{{ item.mine.mineMoves?.fast?.nameFr || item.mine.fastMove || '—' }}</span>
                  <span v-if="item.mine.mineMoves?.fast?.isElite" class="elite-pill">⭐ Élite</span>
                </div>
                <div class="move-badge-item">
                  <span class="move-icon">💥</span>
                  <span class="move-name">{{ item.mine.mineMoves?.charged1?.nameFr || item.mine.chargedMove1 || '—' }}</span>
                  <span v-if="item.mine.mineMoves?.charged1?.isElite" class="elite-pill">⭐ Élite</span>
                </div>
                <div class="move-badge-item">
                  <span class="move-icon">💥</span>
                  <span v-if="item.mine.mineMoves?.charged2?.nameFr || item.mine.chargedMove2" class="move-name">
                    {{ item.mine.mineMoves?.charged2?.nameFr || item.mine.chargedMove2 }}
                  </span>
                  <span v-else class="move-placeholder">
                    — (2ème attaque non débloquée)
                  </span>
                  <span v-if="item.mine.mineMoves?.charged2?.isElite" class="elite-pill">⭐ Élite</span>
                </div>
              </div>
              <div v-else class="not-owned-moves">
                Non possédé
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section matchups-section">
          <h4>MATCHUPS CLÉS</h4>
          <div class="matchups-grid">
            <div class="matchup-category">
              <span class="matchup-cat-label win">Victoires clés</span>
              <div v-if="item.meta.matchups && item.meta.matchups.length > 0" class="chips-list">
                <div v-for="m in item.meta.matchups" :key="m.opponent" class="matchup-chip win">
                  <PokemonSprite :dex-number="m.dexNumber" :alt="m.opponentNameFr" class="chip-sprite" />
                  <span class="chip-name">{{ m.opponentNameFr }}</span>
                  <span v-if="m.rating" class="chip-rating">{{ m.rating }}</span>
                </div>
              </div>
              <span v-else class="no-matchup">N/A</span>
            </div>

            <div class="matchup-category">
              <span class="matchup-cat-label loss">Contres clés</span>
              <div v-if="item.meta.counters && item.meta.counters.length > 0" class="chips-list">
                <div v-for="c in item.meta.counters" :key="c.opponent" class="matchup-chip loss">
                  <PokemonSprite :dex-number="c.dexNumber" :alt="c.opponentNameFr" class="chip-sprite" />
                  <span class="chip-name">{{ c.opponentNameFr }}</span>
                  <span v-if="c.rating" class="chip-rating">{{ c.rating }}</span>
                </div>
              </div>
              <span v-else class="no-matchup">N/A</span>
            </div>
          </div>
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
import PokemonSprite from './PokemonSprite.vue';

const props = defineProps({
  item: { type: Object, required: true }
});
defineEmits(['request-remove']);

const isExpanded = ref(false);

const primaryTypeColor = computed(() => {
  const t = props.item.meta.types?.[0];
  return TYPE_COLORS[t] || '#718096';
});

function getTypeColor(t) {
  return TYPE_COLORS[t] || '#718096';
}
</script>

<style scoped>
.pokemon-row-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  margin-bottom: 0.75rem;
  transition: all 0.2s ease;
  overflow: hidden;
}
.pokemon-row-card:hover {
  border-color: #CBD5E0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}
.pokemon-row-card.shadow {
  border-left: 4px solid #805AD5;
}
.row-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  user-select: none;
}
.rank-badge {
  font-size: 0.85rem;
  font-weight: 700;
  color: #718096;
  width: 32px;
  flex-shrink: 0;
}
.score-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  flex-shrink: 0;
}
.score-num {
  font-size: 0.85rem;
  font-weight: 700;
  color: #2D3748;
  background: #F1F5F9;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}
.name-info {
  flex: 1;
  min-width: 0;
}
.name-line {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}
.pokemon-name {
  font-weight: 600;
  color: #1A202C;
  font-size: 0.95rem;
}
.form-badge {
  font-size: 0.7rem;
  background: #E2E8F0;
  color: #4A5568;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 500;
}
.shadow-badge {
  font-size: 0.7rem;
  background: #805AD5;
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
}
.lucky-badge {
  font-size: 0.7rem;
  background: #FEFCBF;
  color: #B7791F;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
}
.evo-badge {
  font-size: 0.7rem;
  background: #EDE9FE;
  color: #6D28D9;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  font-weight: 600;
}
.better-unevolved-notice {
  font-size: 0.75rem;
  color: #D97706;
  background: #FFFBEB;
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
  margin-top: 0.2rem;
  display: inline-block;
}
.types-line {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.25rem;
}
.type-pill {
  color: white;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 10px;
}
.ownership-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  flex-shrink: 0;
}
.ownership-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.reverse-evo-path {
  font-size: 0.75rem;
  color: #1E40AF;
  background: #EFF6FF;
  border: 1px solid #DBEAFE;
  border-radius: 4px;
  padding: 0.15rem 0.5rem;
  margin-top: 0.25rem;
  display: inline-block;
  font-weight: 500;
}
.not-owned-tag {
  font-size: 0.75rem;
  color: #A0AEC0;
}
.rank-tag {
  font-size: 0.75rem;
  font-weight: 700;
  color: #2B6CB0;
  background: #EBF8FF;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}
.rank-num {
  font-weight: 500;
  color: #4A5568;
}
.costs-line {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.cost-pill {
  font-size: 0.7rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-weight: 600;
}
.cost-pill.dust {
  background: #FEF3C7;
  color: #92400E;
}
.cost-pill.candy {
  background: #FEE2E2;
  color: #991B1B;
}
.cost-pill.xl {
  background: #E0E7FF;
  color: #3730A3;
}
.expand-icon {
  font-size: 0.75rem;
  color: #A0AEC0;
  margin-left: 0.5rem;
}

/* Expanded details */
.expanded-details {
  border-top: 1px solid #EDF2F7;
  padding: 1.25rem;
  background: #FAFBFC;
}

/* Comparison section */
.comparison-section {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.comparison-section h4 {
  font-size: 0.75rem;
  font-weight: 700;
  color: #4A5568;
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
}
.comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.comparison-card {
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid #E2E8F0;
}
.comparison-card.current {
  background: #F8FAFC;
  border-color: #CBD5E0;
}
.comparison-card.candidate {
  background: #FFFBEB;
  border-color: #FCD34D;
}
.comp-header {
  margin-bottom: 0.35rem;
}
.comp-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}
.comp-badge.active {
  background: #E2E8F0;
  color: #4A5568;
}
.comp-badge.potential {
  background: #F59E0B;
  color: white;
}
.comp-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1A202C;
}
.comp-metric {
  font-size: 0.85rem;
  color: #2D3748;
  margin-top: 0.25rem;
}
.comp-cost {
  font-size: 0.75rem;
  color: #718096;
  margin-top: 0.35rem;
}

/* Details grid */
.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
}
.detail-section h4 {
  font-size: 0.75rem;
  color: #718096;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  letter-spacing: 0.05em;
}
.detail-section p {
  margin: 0.3rem 0;
  font-size: 0.85rem;
  color: #2D3748;
}
.evo-tag {
  color: #805AD5;
  font-size: 0.75rem;
  margin-left: 0.25rem;
}

/* Moves section */
.moves-section {
  grid-column: span 2;
}
@media (max-width: 768px) {
  .moves-section {
    grid-column: span 1;
  }
}
.moves-comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 600px) {
  .moves-comparison-grid {
    grid-template-columns: 1fr;
  }
}
.moves-col-header {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748B;
  margin-bottom: 0.45rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.moves-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.move-badge-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
}
.move-icon {
  font-size: 0.85rem;
}
.move-name {
  font-weight: 600;
  color: #1A202C;
}
.move-placeholder {
  color: #94A3B8;
  font-style: italic;
  font-size: 0.8rem;
}
.not-owned-moves {
  font-size: 0.8rem;
  color: #94A3B8;
  font-style: italic;
  padding: 0.4rem 0;
}
.elite-pill {
  font-size: 0.65rem;
  font-weight: 700;
  background: #FEF3C7;
  color: #B45309;
  border: 1px solid #FCD34D;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  margin-left: auto;
}

/* Matchups section */
.matchups-section {
  grid-column: span 2;
}
@media (max-width: 768px) {
  .matchups-section {
    grid-column: span 1;
  }
}
.matchups-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 600px) {
  .matchups-grid {
    grid-template-columns: 1fr;
  }
}
.matchup-category {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.matchup-cat-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.matchup-cat-label.win {
  color: #059669;
}
.matchup-cat-label.loss {
  color: #DC2626;
}
.chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.matchup-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.78rem;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  transition: all 0.15s ease;
}
.matchup-chip.win {
  border-color: #A7F3D0;
  background: #F0FDF4;
}
.matchup-chip.loss {
  border-color: #FECACA;
  background: #FEF2F2;
}
.chip-sprite {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
}
.chip-name {
  font-weight: 600;
  color: #1F2937;
}
.chip-rating {
  font-size: 0.7rem;
  color: #6B7280;
  background: rgba(0, 0, 0, 0.05);
  padding: 0.05rem 0.25rem;
  border-radius: 3px;
  font-weight: 500;
}
.no-matchup {
  font-size: 0.8rem;
  color: #94A3B8;
  font-style: italic;
}

.expanded-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}
.remove-btn {
  background: none;
  border: 1px solid #FC8181;
  color: #E53E3E;
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.remove-btn:hover {
  background: #FFF5F5;
}

/* Evolution Chain Section */
.evolution-chain-section {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  padding: 0.85rem 1rem;
  margin-bottom: 1.25rem;
}

.evolution-chain-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748B;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.evolution-stages-track {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.stage-card {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  min-width: 160px;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.stage-card.is-target {
  border-color: #93C5FD;
  background: #EFF6FF;
  box-shadow: 0 0 0 1px #BFDBFE;
}

.stage-card.is-owned {
  border-color: #A7F3D0;
  background: #F0FDF4;
}

.stage-card.is-target.is-owned {
  border-color: #93C5FD;
  background: #F0FDF4;
  box-shadow: 0 0 0 1px #93C5FD;
}

.stage-sprite {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
}

.stage-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.stage-name-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.stage-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1E293B;
}

.badge-target {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  color: #1D4ED8;
  background: #DBEAFE;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.badge-owned {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  color: #047857;
  background: #DCFCE7;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.badge-missing {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 500;
  color: #64748B;
  background: #F1F5F9;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.stage-arrow {
  color: #94A3B8;
  font-size: 1rem;
  font-weight: bold;
  flex-shrink: 0;
  user-select: none;
}
</style>
