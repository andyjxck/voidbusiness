import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { formatMoney } from '../data/market';
import { t, tf } from '../data/i18n';

export default function TeamRosterModal({
  visible,
  onClose,
  staffMembers = [],
  accentColor = '#a78bfa',
  onFire,
  onRaise,
  onTrain,
  trainCost,
  raiseCost,
  getStaffTypeLabel,
}) {
  if (!visible) return null;

  const hasSkill = staffMembers.some((m) => m.skill != null);
  const hasRating = staffMembers.some((m) => m.rating != null);
  const hasSalary = staffMembers.some((m) => m.salary != null);

  const avgSkill = hasSkill && staffMembers.length > 0
    ? staffMembers.reduce((s, m) => s + (m.skill || 0), 0) / staffMembers.length
    : 0;
  const skillColor = avgSkill >= 8 ? '#4ade80' : avgSkill >= 5 ? '#fbbf24' : '#f87171';

  const getSkillColor = (val) => val >= 8 ? '#4ade80' : val >= 5 ? '#fbbf24' : '#f87171';

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('staff_team_roster')}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={styles.summary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{staffMembers.length}</Text>
                <Text style={styles.summaryLabel}>{t('staff_members')}</Text>
              </View>
              {hasSkill && (
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: skillColor }]}>{avgSkill.toFixed(1)}</Text>
                  <Text style={styles.summaryLabel}>{t('staff_avg_skill')}</Text>
                </View>
              )}
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: accentColor }]}>{formatMoney(staffMembers.reduce((s, m) => s + (m.salary || 0), 0))}</Text>
                <Text style={styles.summaryLabel}>{t('staff_salary_hr')}</Text>
              </View>
            </View>

            {staffMembers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={40} color="#475569" />
                <Text style={styles.emptyText}>{t('no_staff_hire_from')}</Text>
              </View>
            ) : (
              staffMembers.map((m, i) => {
                const genderIcon = m.gender === 'female' ? 'woman' : 'man';
                const genderColor = m.gender === 'female' ? '#ec4899' : '#3b82f6';
                const typeLabel = getStaffTypeLabel ? getStaffTypeLabel(m) : null;
                const skillVal = m.skill != null ? m.skill : m.rating != null ? m.rating : null;
                const sColor = skillVal != null ? getSkillColor(skillVal) : null;

                return (
                  <View key={m.id || i} style={styles.staffCard}>
                    <View style={styles.staffCardTop}>
                      <View style={[styles.staffCardAvatar, { backgroundColor: `${genderColor}15` }]}>
                        <Ionicons name={genderIcon} size={22} color={genderColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.staffCardName}>{m.name}</Text>
                        <Text style={styles.staffCardRole}>
                          {typeLabel ? `${typeLabel} · ` : ''}{t('staff_age_label', { v0: m.age })}
                        </Text>
                      </View>
                      {skillVal != null && (
                        <View style={styles.staffCardSkillBox}>
                          <Text style={[styles.staffCardSkillValue, { color: sColor }]}>{skillVal}</Text>
                          <Text style={styles.staffCardSkillLabel}>{hasSkill ? t('staff_skill') : t('staff_rating')}</Text>
                        </View>
                      )}
                    </View>

                    {skillVal != null && (
                      <View style={styles.staffCardSkillBar}>
                        <View style={[styles.staffCardSkillFill, { width: `${skillVal * 10}%`, backgroundColor: sColor }]} />
                      </View>
                    )}

                    {m.salary != null && (
                      <View style={styles.staffCardSalaryRow}>
                        <Ionicons name="cash-outline" size={14} color="#f87171" />
                        <Text style={styles.staffCardSalaryText}>{formatMoney(m.salary)}/hr</Text>
                      </View>
                    )}

                    <View style={styles.staffCardActions}>
                      {onTrain && (
                        <Pressable
                          style={[styles.staffCardBtn, { borderColor: 'rgba(251,191,36,0.3)' }]}
                          onPress={() => onTrain(m)}
                        >
                          <Ionicons name="school-outline" size={14} color="#fbbf24" />
                          <Text style={[styles.staffCardBtnText, { color: '#fbbf24' }]}>
                            {trainCost ? tf('staff_train_for', { v0: formatMoney(trainCost) }) : t('staff_train')}
                          </Text>
                        </Pressable>
                      )}
                      {onRaise && (
                        <Pressable
                          style={[styles.staffCardBtn, { borderColor: 'rgba(74,222,128,0.3)' }]}
                          onPress={() => onRaise(m)}
                        >
                          <Ionicons name="trending-up-outline" size={14} color="#4ade80" />
                          <Text style={[styles.staffCardBtnText, { color: '#4ade80' }]}>
                            {raiseCost ? tf('staff_raise_for', { v0: formatMoney(raiseCost) }) : t('staff_raise')}
                          </Text>
                        </Pressable>
                      )}
                      {onFire && (
                        <Pressable
                          style={[styles.staffCardBtn, { borderColor: 'rgba(248,113,113,0.3)' }]}
                          onPress={() => onFire(m)}
                        >
                          <Ionicons name="person-remove-outline" size={14} color="#f87171" />
                          <Text style={[styles.staffCardBtnText, { color: '#f87171' }]}>{t('staff_fire')}</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)' },
  modal: { width: '100%', maxWidth: 400, maxHeight: '80%', backgroundColor: '#15181e', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 18, color: '#fff', fontWeight: '800' },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  summaryValue: { fontSize: 18, color: '#fff', fontWeight: '800' },
  summaryLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  staffCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  staffCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  staffCardAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  staffCardName: { fontSize: 14, color: '#fff', fontWeight: '700' },
  staffCardRole: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
  staffCardSkillBox: { alignItems: 'center' },
  staffCardSkillValue: { fontSize: 20, fontWeight: '800' },
  staffCardSkillLabel: { fontSize: 8, color: '#64748b', fontWeight: '700', letterSpacing: 0.5 },
  staffCardSkillBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  staffCardSkillFill: { height: '100%', borderRadius: 2 },
  staffCardSalaryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  staffCardSalaryText: { fontSize: 11, color: '#f87171', fontWeight: '600' },
  staffCardActions: { flexDirection: 'row', gap: 6 },
  staffCardBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderRadius: 8, paddingVertical: 8 },
  staffCardBtnText: { fontSize: 10, fontWeight: '700' },
});
