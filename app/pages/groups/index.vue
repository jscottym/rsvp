<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

const groupsStore = useGroupsStore()
const toast = useToast()

const loading = ref(true)
const groups = computed(() => groupsStore.sortedGroups)

// Expanded group tracking
const expandedGroupId = ref<string | null>(null)

// Create group inline form
const showCreateForm = ref(false)
const newGroupName = ref('')
const creating = ref(false)

// Add member inline form (per group)
const addingMemberToGroupId = ref<string | null>(null)
const newMemberName = ref('')
const newMemberPhone = ref('')
const addingMember = ref(false)

// Edit member inline form
const editingMemberId = ref<string | null>(null)
const editMemberName = ref('')
const editMemberPhone = ref('')
const savingMember = ref(false)

// Edit group name
const editingGroupId = ref<string | null>(null)
const editGroupName = ref('')
const savingGroup = ref(false)

// Delete confirmation
const deletingGroupId = ref<string | null>(null)

// Invite link state
const personalInviteCode = ref<string | null>(null)
const loadingInviteCode = ref(false)
const copiedPersonal = ref(false)
const groupInviteCodes = ref<Map<string, string>>(new Map())
const loadingGroupInvite = ref<string | null>(null)
const copiedGroupId = ref<string | null>(null)

onMounted(async () => {
  try {
    await groupsStore.fetchMyGroups()
  } finally {
    loading.value = false
  }
})

function toggleGroup(groupId: string) {
  if (expandedGroupId.value === groupId) {
    expandedGroupId.value = null
  } else {
    expandedGroupId.value = groupId
  }
  // Reset any open forms when collapsing
  addingMemberToGroupId.value = null
  editingMemberId.value = null
  editingGroupId.value = null
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatPhoneInput(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

function toE164(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  return input
}

function formatPhone(phone: string): string {
  // Format US phone numbers nicely
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

function handleNameClick(event: Event, group: any) {
  if (expandedGroupId.value === group.id && group.type !== 'MY_PEOPLE') {
    event.stopPropagation()
    startEditGroup(group)
  }
}

function handleNewMemberPhone(value: string) {
  newMemberPhone.value = formatPhoneInput(value)
}

function handleEditMemberPhone(value: string) {
  editMemberPhone.value = formatPhoneInput(value)
}

function textGroup(group: any) {
  if (!group.members?.length) return
  const phones = group.members.map((m: any) => m.phone).join(',')
  window.location.href = `sms:${phones}`
}

function textMember(phone: string) {
  window.location.href = `sms:${phone}`
}

// Create group
async function createGroup() {
  if (!newGroupName.value.trim()) return
  creating.value = true
  try {
    await groupsStore.createGroup({
      name: newGroupName.value.trim(),
      visibility: 'PRIVATE'
    })
    toast.add({
      title: 'Group created!',
      color: 'success'
    })
    newGroupName.value = ''
    showCreateForm.value = false
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to create group',
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}

// Add member
function startAddMember(groupId: string) {
  addingMemberToGroupId.value = groupId
  newMemberName.value = ''
  newMemberPhone.value = ''
  editingMemberId.value = null
}

function cancelAddMember() {
  addingMemberToGroupId.value = null
  newMemberName.value = ''
  newMemberPhone.value = ''
}

async function addMember(groupId: string) {
  if (!newMemberName.value.trim() || !newMemberPhone.value.trim()) return
  addingMember.value = true
  try {
    await groupsStore.addMember(groupId, newMemberName.value.trim(), toE164(newMemberPhone.value))
    toast.add({
      title: 'Member added!',
      color: 'success'
    })
    cancelAddMember()
    // Refresh group to get updated members
    await groupsStore.fetchMyGroups()
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to add member',
      color: 'error'
    })
  } finally {
    addingMember.value = false
  }
}

// Edit member
function startEditMember(member: any) {
  editingMemberId.value = member.id
  editMemberName.value = member.name
  editMemberPhone.value = formatPhoneInput(member.phone)
  addingMemberToGroupId.value = null
}

function cancelEditMember() {
  editingMemberId.value = null
  editMemberName.value = ''
  editMemberPhone.value = ''
}

async function saveMember(groupId: string, memberId: string) {
  if (!editMemberName.value.trim() || !editMemberPhone.value.trim()) return
  savingMember.value = true
  try {
    await groupsStore.updateMember(groupId, memberId, editMemberName.value.trim(), toE164(editMemberPhone.value))
    toast.add({
      title: 'Member updated!',
      color: 'success'
    })
    cancelEditMember()
    await groupsStore.fetchMyGroups()
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to update member',
      color: 'error'
    })
  } finally {
    savingMember.value = false
  }
}

// Remove member
async function removeMember(groupId: string, memberId: string) {
  try {
    await groupsStore.removeMember(groupId, memberId)
    toast.add({
      title: 'Member removed',
      color: 'success'
    })
    await groupsStore.fetchMyGroups()
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to remove member',
      color: 'error'
    })
  }
}

// Edit group name
function startEditGroup(group: any) {
  editingGroupId.value = group.id
  editGroupName.value = group.name
}

function cancelEditGroup() {
  editingGroupId.value = null
  editGroupName.value = ''
}

async function saveGroupName(groupId: string) {
  if (!editGroupName.value.trim()) return
  savingGroup.value = true
  try {
    await groupsStore.updateGroup(groupId, { name: editGroupName.value.trim() })
    toast.add({
      title: 'Group updated!',
      color: 'success'
    })
    cancelEditGroup()
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to update group',
      color: 'error'
    })
  } finally {
    savingGroup.value = false
  }
}

// Delete group
async function deleteGroup(groupId: string) {
  try {
    await groupsStore.deleteGroup(groupId)
    toast.add({
      title: 'Group deleted',
      color: 'success'
    })
    expandedGroupId.value = null
    deletingGroupId.value = null
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to delete group',
      color: 'error'
    })
  }
}

// Invite link functions
async function fetchPersonalInviteCode() {
  if (personalInviteCode.value) return
  loadingInviteCode.value = true
  try {
    const authStore = useAuthStore()
    const token = await authStore.getIdToken()
    const data = await $fetch<{ inviteCode: string }>('/api/invite/my-code', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    personalInviteCode.value = data.inviteCode
  } catch {
    toast.add({ title: 'Error', description: 'Failed to get invite link', color: 'error' })
  } finally {
    loadingInviteCode.value = false
  }
}

function getPersonalInviteUrl() {
  if (!personalInviteCode.value) return ''
  return `${window.location.origin}/invite/u/${personalInviteCode.value}`
}

async function copyPersonalLink() {
  const url = getPersonalInviteUrl()
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    copiedPersonal.value = true
    setTimeout(() => { copiedPersonal.value = false }, 2000)
  } catch {
    toast.add({ title: 'Error', description: 'Failed to copy', color: 'error' })
  }
}

async function sharePersonalLink() {
  const url = getPersonalInviteUrl()
  if (!url) return
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Add me on RSVP', url })
    } catch {
      // User cancelled share
    }
  } else {
    await copyPersonalLink()
  }
}

async function fetchGroupInviteCode(groupId: string) {
  if (groupInviteCodes.value.has(groupId)) return
  loadingGroupInvite.value = groupId
  try {
    const authStore = useAuthStore()
    const token = await authStore.getIdToken()
    const data = await $fetch<{ inviteCode: string }>(`/api/invite/group-code/${groupId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    groupInviteCodes.value.set(groupId, data.inviteCode)
  } catch {
    toast.add({ title: 'Error', description: 'Failed to get invite link', color: 'error' })
  } finally {
    loadingGroupInvite.value = null
  }
}

async function shareGroupLink(groupId: string) {
  await fetchGroupInviteCode(groupId)
  const code = groupInviteCodes.value.get(groupId)
  if (!code) return

  const url = `${window.location.origin}/invite/g/${code}`
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Join my group on RSVP', url })
    } catch {
      // User cancelled
    }
  } else {
    try {
      await navigator.clipboard.writeText(url)
      copiedGroupId.value = groupId
      setTimeout(() => { copiedGroupId.value = null }, 2000)
    } catch {
      toast.add({ title: 'Error', description: 'Failed to copy', color: 'error' })
    }
  }
}

// Fetch personal invite code on mount
onMounted(async () => {
  fetchPersonalInviteCode()
})

useSeoMeta({
  title: 'My Groups - RSVP'
})
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-6 pb-24">
    <!-- Header -->
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Groups</h1>

    <!-- Personal Invite Link Card -->
    <div
      v-if="!loading && personalInviteCode"
      class="mb-6 p-4 bg-gradient-to-r from-teal-50 to-teal-100/50 dark:from-teal-900/20 dark:to-teal-800/10
             rounded-2xl border border-teal-200/50 dark:border-teal-800/50"
    >
      <div class="flex items-start gap-3">
        <span class="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-teal-500/20">
          <UIcon name="i-heroicons-link" class="w-5 h-5 text-white" />
        </span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-900 dark:text-white text-sm">Your invite link</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Share to let people add you as a contact</p>
          <div class="flex gap-2 mt-3">
            <button
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                     bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                     text-gray-700 dark:text-gray-300
                     transition-all duration-200 active:scale-95"
              @click="copyPersonalLink"
            >
              <UIcon :name="copiedPersonal ? 'i-heroicons-check' : 'i-heroicons-clipboard'" class="w-4 h-4" />
              {{ copiedPersonal ? 'Copied!' : 'Copy' }}
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                     bg-teal-500 text-white shadow-sm
                     transition-all duration-200 active:scale-95"
              @click="sharePersonalLink"
            >
              <UIcon name="i-heroicons-share" class="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Empty State -->
    <div v-else-if="groups.length === 0 && !showCreateForm" class="text-center py-12">
      <div class="w-20 h-20 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-heroicons-user-group" class="w-10 h-10 text-teal-600 dark:text-teal-400" />
      </div>
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No groups yet</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">Create a group to save contacts and text them easily!</p>
      <button
        class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white
               bg-gradient-to-r from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30
               transition-all duration-200 active:scale-95"
        @click="showCreateForm = true"
      >
        <UIcon name="i-heroicons-plus" class="w-5 h-5" />
        Create Group
      </button>
    </div>

    <!-- Groups List -->
    <div v-else class="space-y-4">
      <!-- Group Cards -->
      <div
        v-for="group in groups"
        :key="group.id"
        class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
      >
        <!-- Group Header (always visible) -->
        <div
          class="w-full p-4 text-left transition-all duration-200 active:scale-[0.99] cursor-pointer"
          @click="toggleGroup(group.id)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span
                v-if="group.type === 'MY_PEOPLE'"
                class="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0"
              >
                <UIcon name="i-heroicons-heart" class="w-4 h-4 text-white" />
              </span>
              <div class="flex-1 min-w-0">
                <!-- Inline group name editing -->
                <div v-if="editingGroupId === group.id" class="flex items-center gap-2" @click.stop>
                  <input
                    v-model="editGroupName"
                    class="font-semibold text-gray-900 dark:text-white bg-transparent border-b-2 border-teal-500 outline-none py-0.5 w-full"
                    @keyup.enter="saveGroupName(group.id)"
                    @keydown.escape="cancelEditGroup"
                    autofocus
                  />
                  <button
                    v-if="savingGroup"
                    class="flex-shrink-0"
                  >
                    <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin text-teal-500" />
                  </button>
                  <button
                    v-else
                    class="flex-shrink-0 text-teal-500 active:scale-95"
                    @click="saveGroupName(group.id)"
                  >
                    <UIcon name="i-heroicons-check" class="w-5 h-5" />
                  </button>
                  <button
                    class="flex-shrink-0 text-gray-400 active:scale-95"
                    @click="cancelEditGroup"
                  >
                    <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
                  </button>
                </div>
                <!-- Normal display -->
                <h3
                  v-else
                  class="font-semibold text-gray-900 dark:text-white truncate"
                  :class="{ 'hover:text-teal-600 dark:hover:text-teal-400': expandedGroupId === group.id && group.type !== 'MY_PEOPLE' }"
                  @click="handleNameClick($event, group)"
                >{{ group.name }}</h3>
                <p class="text-sm text-gray-500">{{ group.memberCount || 0 }} {{ group.memberCount === 1 ? 'contact' : 'contacts' }}</p>
              </div>
            </div>
            <UIcon
              name="i-heroicons-chevron-down"
              class="w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0"
              :class="{ 'rotate-180': expandedGroupId === group.id }"
            />
          </div>
        </div>

        <!-- Expanded Content -->
        <div v-if="expandedGroupId === group.id" class="px-4 pb-4 space-y-4">
          <!-- Action Buttons -->
          <div class="flex gap-2">
            <button
              v-if="group.members?.length"
              class="flex-1 flex items-center justify-center gap-2 py-4
                     bg-gradient-to-r from-teal-500 to-teal-600
                     rounded-xl shadow-lg shadow-teal-500/30
                     text-white font-semibold
                     transition-all duration-200 active:scale-[0.98]"
              @click="textGroup(group)"
            >
              <UIcon name="i-heroicons-chat-bubble-left-ellipsis" class="w-5 h-5" />
              Text Group
            </button>
            <button
              v-if="group.type !== 'MY_PEOPLE'"
              class="flex items-center justify-center gap-2 px-4 py-4
                     bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600
                     rounded-xl text-gray-700 dark:text-gray-300 font-semibold
                     transition-all duration-200 active:scale-[0.98]"
              :class="{ 'flex-1': !group.members?.length }"
              @click="shareGroupLink(group.id)"
            >
              <UIcon
                v-if="loadingGroupInvite === group.id"
                name="i-heroicons-arrow-path"
                class="w-5 h-5 animate-spin"
              />
              <UIcon
                v-else-if="copiedGroupId === group.id"
                name="i-heroicons-check"
                class="w-5 h-5 text-teal-500"
              />
              <UIcon
                v-else
                name="i-heroicons-link"
                class="w-5 h-5"
              />
              {{ copiedGroupId === group.id ? 'Copied!' : 'Invite Link' }}
            </button>
          </div>

          <!-- Members List -->
          <div v-if="group.members?.length" class="space-y-2">
            <template v-for="member in group.members" :key="member.id">
              <!-- Edit Member Form -->
              <div
                v-if="editingMemberId === member.id"
                class="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl space-y-3"
              >
                <UInput
                  v-model="editMemberName"
                  placeholder="Name"
                  size="lg"
                  class="w-full"
                  autofocus
                />
                <UInput
                  :model-value="editMemberPhone"
                  placeholder="(555) 123-4567"
                  size="lg"
                  type="tel"
                  class="w-full"
                  @update:model-value="handleEditMemberPhone"
                />
                <div class="flex gap-2">
                  <UButton color="neutral" variant="ghost" @click="cancelEditMember">Cancel</UButton>
                  <UButton
                    color="primary"
                    :loading="savingMember"
                    :disabled="!editMemberName.trim() || !editMemberPhone.trim()"
                    @click="saveMember(group.id, member.id)"
                  >
                    Save
                  </UButton>
                </div>
              </div>

              <!-- Member Row -->
              <div
                v-else
                class="flex items-center gap-3 py-3 px-3
                       bg-gray-50 dark:bg-gray-700/50 rounded-xl
                       group"
              >
                <!-- Avatar -->
                <span
                  class="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/30
                         flex items-center justify-center text-sm font-medium
                         text-teal-700 dark:text-teal-300 flex-shrink-0"
                >
                  {{ getInitials(member.name) }}
                </span>

                <!-- Name & Phone -->
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white truncate">{{ member.name }}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">{{ formatPhone(member.phone) }}</p>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Text"
                    @click.stop="textMember(member.phone)"
                  >
                    <UIcon name="i-heroicons-chat-bubble-left" class="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Edit"
                    @click.stop="startEditMember(member)"
                  >
                    <UIcon name="i-heroicons-pencil" class="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    class="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    title="Remove"
                    @click.stop="removeMember(group.id, member.id)"
                  >
                    <UIcon name="i-heroicons-trash" class="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </template>
          </div>

          <!-- No Members Message -->
          <p v-else class="text-center text-gray-500 py-4">
            No members yet. Add some below!
          </p>

          <!-- Add Member Form -->
          <div v-if="addingMemberToGroupId === group.id" class="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl space-y-3">
            <UInput
              v-model="newMemberName"
              placeholder="Name"
              size="lg"
              class="w-full"
              autofocus
            />
            <UInput
              :model-value="newMemberPhone"
              placeholder="(555) 123-4567"
              size="lg"
              type="tel"
              class="w-full"
              @update:model-value="handleNewMemberPhone"
            />
            <div class="flex gap-2">
              <UButton color="neutral" variant="ghost" @click="cancelAddMember">Cancel</UButton>
              <UButton
                color="primary"
                :loading="addingMember"
                :disabled="!newMemberName.trim() || !newMemberPhone.trim()"
                @click="addMember(group.id)"
              >
                Add
              </UButton>
            </div>
          </div>

          <!-- Add Member Button -->
          <button
            v-else
            class="w-full py-3 text-teal-600 dark:text-teal-400 font-medium hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-xl transition-colors"
            @click="startAddMember(group.id)"
          >
            + Add member
          </button>

          <!-- Group Actions Divider (hidden for My People) -->
          <div v-if="group.type !== 'MY_PEOPLE'" class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <!-- Delete Confirmation -->
            <div v-if="deletingGroupId === group.id" class="space-y-3">
              <p class="text-center text-gray-600 dark:text-gray-400">
                Delete <strong>{{ group.name }}</strong>? This cannot be undone.
              </p>
              <div class="flex gap-2">
                <UButton color="neutral" variant="ghost" class="flex-1" @click="deletingGroupId = null">Cancel</UButton>
                <UButton color="error" class="flex-1" @click="deleteGroup(group.id)">
                  Delete
                </UButton>
              </div>
            </div>

            <!-- Delete Button -->
            <div v-else class="text-sm">
              <button
                class="text-red-500 hover:text-red-600 transition-colors"
                @click="deletingGroupId = group.id"
              >
                Delete group
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Group Inline Form -->
      <div
        v-if="showCreateForm"
        class="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border-2 border-dashed border-teal-300 dark:border-teal-700"
      >
        <UInput
          v-model="newGroupName"
          placeholder="New group name..."
          size="xl"
          autofocus
          @keyup.enter="createGroup"
        />
        <div class="flex gap-2 mt-3">
          <UButton color="neutral" variant="ghost" @click="showCreateForm = false; newGroupName = ''">
            Cancel
          </UButton>
          <UButton
            color="primary"
            class="flex-1"
            :loading="creating"
            :disabled="!newGroupName.trim()"
            @click="createGroup"
          >
            Create Group
          </UButton>
        </div>
      </div>

      <!-- Create Group Button -->
      <button
        v-else
        class="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl
               text-gray-500 hover:text-teal-600 hover:border-teal-300
               dark:hover:text-teal-400 dark:hover:border-teal-700
               transition-all duration-200 font-medium"
        @click="showCreateForm = true"
      >
        + Create Group
      </button>
    </div>
  </div>
</template>
