<template>
  <div v-if="isOpen" class="modal-backdrop">
    <div class="modal-box">
      <h3 class="modal-title">{{ title }}</h3>
      <p class="modal-message">{{ message }}</p>
      <div class="modal-actions">
        <button class="btn-cancel" @click="$emit('cancel')">Annuler</button>
        <button class="btn-confirm" @click="$emit('confirm')">Confirmer</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isOpen: Boolean,
  title: { type: String, default: 'Confirmation' },
  message: { type: String, default: 'Êtes-vous sûr ?' }
});
defineEmits(['cancel', 'confirm']);
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-box {
  background: #FFFFFF;
  border-radius: 10px;
  width: 400px;
  max-width: 90%;
  padding: 1.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}
.modal-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
}
.modal-message {
  color: #4A5568;
  font-size: 0.9rem;
  margin: 0 0 1.5rem 0;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
.btn-cancel {
  padding: 0.5rem 1rem;
  background: #E2E8F0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-confirm {
  padding: 0.5rem 1rem;
  background: #EF4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
