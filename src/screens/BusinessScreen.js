import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Modal, Dimensions } from 'react-native';
import Text, { useLanguage } from '../components/AppText';
import { t, tf, tBusinessName, tBusinessCategory, tBusinessSubCategory } from '../data/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../data/hapticsProxy';
import { showRewardedAd } from '../data/ads';
const { width } = Dimensions.get('window');

import { formatMoney } from '../data/market';
import {
  BUSINESS_CATEGORIES,
  startBusiness,
  getHourlyIncome,
  getHourlyStockUsage,
  getTaxOwed,
  getSubType,
  getUpgradeCost,
  upgradeBusiness,
  completeUpgradeNow,
  payTax,
  getSellPrice,
  getStockCost,
  buyStock,
  isSuspended,
} from '../data/businesses';
import { recordBusinessBought, recordBusinessSold } from '../data/stats';
import BusinessDetailScreen from './business/BusinessDetailScreen';
import BusinessSettingsScreen from './business/BusinessSettingsScreen';
import BusServiceScreen from './business/BusServiceScreen';
import CourierServiceScreen from './business/CourierServiceScreen';
import GameDevScreen from './business/GameDevScreen';
import ConstructionScreen from './business/ConstructionScreen';
import DealershipScreen from './business/DealershipScreen';
import ClothingScreen from './business/ClothingScreenV2';
import BankScreen from './business/BankScreen';
import MovieStudioScreen from './business/MovieStudioScreen';
import CafeScreen from './business/CafeScreenV2';
import { getConstructionPendingPayout } from '../data/construction';
import { getDealershipPendingSales } from '../data/dealership';
import { getMovieStudioPendingSales } from '../data/moviestudio';
import { webModalOverlay, webModalSheet } from '../components/webModal';

const INDUSTRY_COLORS = {
  cafe: '#fbbf24',
  bus: '#34d399',
  courier: '#38bdf8',
  gamedev: '#a78bfa',
  construction: '#f97316',
  dealership: '#22d3ee',
  clothing: '#ec4899',
  bank: '#22c55e',
  moviestudio: '#f472b6',
};

const getIndustryColor = (type) => INDUSTRY_COLORS[type] || '#a78bfa';

export default function BusinessScreen({ money, ownedBusinesses, businessBoostExpiresAt, onChange, onActivateBoost }) {
  useLanguage();
  const [startModal, setStartModal] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const totalIncome = useMemo(() => {
    return ownedBusinesses.reduce((sum, b) => sum + getHourlyIncome(b, businessBoostExpiresAt), 0);
  }, [ownedBusinesses, businessBoostExpiresAt]);

  const totalPending = useMemo(() => {
    return ownedBusinesses.reduce((sum, b) => {
      if (b.type === 'construction') return sum + getConstructionPendingPayout(b);
      if (b.type === 'dealership') return sum + getDealershipPendingSales(b);
      if (b.type === 'moviestudio') return sum + getMovieStudioPendingSales(b);
      return sum;
    }, 0);
  }, [ownedBusinesses]);

  const handleStart = useCallback((type, subKey) => {
    const sub = getSubType(type, subKey);
    if (!sub) return;
    if (money < sub.cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const business = startBusiness(type, subKey);
    if (business) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      recordBusinessBought();
      onChange({
        money: money - sub.cost,
        ownedBusinesses: [...ownedBusinesses, business],
      });
      setStartModal(false);
    }
  }, [money, ownedBusinesses, onChange]);

  const handleSkipUpgrade = useCallback((business) => {
    showRewardedAd(() => finishWatchAd(business.id));
  }, [ownedBusinesses, money, onChange]);

  const finishWatchAd = (passedTarget) => {
    if (!passedTarget) return;
    const business = ownedBusinesses.find((b) => b.id === passedTarget);
    if (business) {
      const updated = completeUpgradeNow(business);
      onChange({
        money,
        ownedBusinesses: ownedBusinesses.map((b) => (b.id === passedTarget ? updated : b)),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleUpgrade = useCallback((business) => {
    const cost = getUpgradeCost(business);
    const sub = getSubType(business.type, business.subType);
    if (money < cost) return;
    if (!sub || business.level >= sub.maxLevel) return;
    const upgraded = upgradeBusiness(business);
    if (!upgraded) return;
    onChange({
      money: money - cost,
      ownedBusinesses: ownedBusinesses.map((b) => (b.id === business.id ? upgraded : b)),
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [money, ownedBusinesses, onChange]);

  const handlePayTax = useCallback((business) => {
    const owed = getTaxOwed(business);
    if (money < owed) return;
    onChange({
      money: money - owed,
      ownedBusinesses: ownedBusinesses.map((b) => (b.id === business.id ? payTax(b) : b)),
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [money, ownedBusinesses, onChange]);

  const handleSell = useCallback((business) => {
    const price = getSellPrice(business);
    recordBusinessSold();
    onChange({
      money: money + price,
      ownedBusinesses: ownedBusinesses.filter((b) => b.id !== business.id),
    });
    setSettingsId(null);
    setDetailId(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [money, ownedBusinesses, onChange]);

  const handleRename = useCallback((business, newName) => {
    const trimmed = newName.trim();
    if (trimmed.length === 0) return;
    onChange({
      ownedBusinesses: ownedBusinesses.map((b) => (b.id === business.id ? { ...b, name: trimmed } : b)),
    });
    setSettingsId(null);
  }, [ownedBusinesses, onChange]);

  const handleBuyStock = useCallback((business, quantity) => {
    const cost = getStockCost(business, quantity);
    if (money < cost || quantity <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const restocked = buyStock(business, quantity);
    onChange({
      money: money - cost,
      ownedBusinesses: ownedBusinesses.map((b) => (b.id === business.id ? restocked : b)),
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [money, ownedBusinesses, onChange]);

  const selectedBusiness = ownedBusinesses.find((b) => b.id === detailId);
  const settingsBusiness = ownedBusinesses.find((b) => b.id === settingsId);
  const boostActive = businessBoostExpiresAt > Date.now();

  if (settingsBusiness) {
    return (
      <BusinessSettingsScreen
        business={settingsBusiness}
        boostExpiresAt={businessBoostExpiresAt}
        onBack={() => setSettingsId(null)}
        onRename={(name) => handleRename(settingsBusiness, name)}
        onSell={handleSell}
      />
    );
  }

  if (selectedBusiness) {
    if (selectedBusiness.type === 'cafe') {
      return (
        <CafeScreen
          business={selectedBusiness}
          money={money}
          onBack={() => setDetailId(null)}
          onOpenSettings={() => setSettingsId(selectedBusiness.id)}
          onCafeUpdate={(updated, newMoney) => {
            onChange({ money: newMoney, ownedBusinesses: ownedBusinesses.map((business) => (business.id === updated.id ? updated : business)) });
          }}
        />
      );
    }
    if (selectedBusiness.type === 'bus') {
      return (
        <BusServiceScreen
          business={selectedBusiness}
          money={money}
          boostExpiresAt={businessBoostExpiresAt}
          onBack={() => setDetailId(null)}
          onOpenSettings={() => setSettingsId(selectedBusiness.id)}
          onBusUpdate={(updatedBus, newMoney) => {
            onChange({
              money: newMoney,
              ownedBusinesses: ownedBusinesses.map((b) => (b.id === updatedBus.id ? updatedBus : b)),
            });
          }}
        />
      );
    }
    if (selectedBusiness.type === 'courier') {
      return (
        <CourierServiceScreen
          business={selectedBusiness}
          money={money}
          boostExpiresAt={businessBoostExpiresAt}
          onBack={() => setDetailId(null)}
          onOpenSettings={() => setSettingsId(selectedBusiness.id)}
          onCourierUpdate={(updated, newMoney) => {
            onChange({
              money: newMoney,
              ownedBusinesses: ownedBusinesses.map((b) => (b.id === updated.id ? updated : b)),
            });
          }}
        />
      );
    }
    if (selectedBusiness.type === 'gamedev') {
      return (
        <GameDevScreen
          business={selectedBusiness}
          money={money}
          boostExpiresAt={businessBoostExpiresAt}
          onBack={() => setDetailId(null)}
          onOpenSettings={() => setSettingsId(selectedBusiness.id)}
          onGameDevUpdate={(updated, newMoney) => {
            onChange({
              money: newMoney,
              ownedBusinesses: ownedBusinesses.map((b) => (b.id === updated.id ? updated : b)),
            });
          }}
        />
      );
    }
    if (selectedBusiness.type === 'construction') {
      return (
        <ConstructionScreen
          business={selectedBusiness}
          money={money}
          boostExpiresAt={businessBoostExpiresAt}
          onBack={() => setDetailId(null)}
          onOpenSettings={() => setSettingsId(selectedBusiness.id)}
          onConstructionUpdate={(updated, newMoney) => {
            onChange({
              money: newMoney,
              ownedBusinesses: ownedBusinesses.map((b) => (b.id === updated.id ? updated : b)),
            });
          }}
        />
      );
    }
    if (selectedBusiness.type === 'dealership') {
      return (
        <DealershipScreen
          business={selectedBusiness}
          money={money}
          boostExpiresAt={businessBoostExpiresAt}
          onBack={() => setDetailId(null)}
          onOpenSettings={() => setSettingsId(selectedBusiness.id)}
          onDealershipUpdate={(updated, newMoney) => {
            onChange({
              money: newMoney,
              ownedBusinesses: ownedBusinesses.map((b) => (b.id === updated.id ? updated : b)),
            });
          }}
          ownedBusinesses={ownedBusinesses}
        />
      );
    }
    if (selectedBusiness.type === 'clothing') {
      return (
        <ClothingScreen
          business={selectedBusiness}
          money={money}
          boostExpiresAt={businessBoostExpiresAt}
          onBack={() => setDetailId(null)}
          onOpenSettings={() => setSettingsId(selectedBusiness.id)}
          onClothingUpdate={(updated, newMoney) => {
            onChange({
              money: newMoney,
              ownedBusinesses: ownedBusinesses.map((b) => (b.id === updated.id ? updated : b)),
            });
          }}
        />
      );
    }
    if (selectedBusiness.type === 'bank') {
      return (
        <BankScreen
          business={selectedBusiness}
          money={money}
          boostExpiresAt={businessBoostExpiresAt}
          onBack={() => setDetailId(null)}
          onOpenSettings={() => setSettingsId(selectedBusiness.id)}
          onBankUpdate={(updated, newMoney) => {
            onChange({
              money: newMoney,
              ownedBusinesses: ownedBusinesses.map((b) => (b.id === updated.id ? updated : b)),
            });
          }}
        />
      );
    }
    if (selectedBusiness.type === 'moviestudio') {
      return (
        <MovieStudioScreen
          business={selectedBusiness}
          money={money}
          boostExpiresAt={businessBoostExpiresAt}
          onBack={() => setDetailId(null)}
          onOpenSettings={() => setSettingsId(selectedBusiness.id)}
          onMovieStudioUpdate={(updated, newMoney) => {
            onChange({
              money: newMoney,
              ownedBusinesses: ownedBusinesses.map((b) => (b.id === updated.id ? updated : b)),
            });
          }}
        />
      );
    }
    return (
      <View style={{ flex: 1 }}>
        <BusinessDetailScreen
          business={selectedBusiness}
          money={money}
          boostExpiresAt={businessBoostExpiresAt}
          onBack={() => setDetailId(null)}
          onOpenSettings={() => setSettingsId(selectedBusiness.id)}
          onUpgrade={handleUpgrade}
          onSkipUpgrade={() => handleSkipUpgrade(selectedBusiness)}
          onPayTax={handlePayTax}
          onSell={handleSell}
          onBuyStock={handleBuyStock}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('business')}</Text>
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={['#1e1b4b', '#312e81', '#1e3a5f', '#0c4a6e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'transparent', 'rgba(255,255,255,0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardShine}
            />
            <View style={styles.cardTop}>
              <View style={styles.cardChipRow}>
                <View style={styles.cardChip} />
                <Ionicons name="wifi" size={16} color="rgba(255,255,255,0.25)" style={{ transform: [{ rotate: '90deg' }] }} />
              </View>
              {boostActive ? (
                <View style={styles.boostActivePill}>
                  <Ionicons name="flash" size={12} color="#4ade80" />
                  <Text style={styles.boostActiveText}>10x</Text>
                </View>
              ) : (
                <Pressable
                  style={styles.boostBtn}
                  onPress={() => {
                    if (onActivateBoost) onActivateBoost();
                  }}
                >
                  <Ionicons name="flash" size={12} color="#000" />
                  <Text style={styles.boostBtnText}>10x 1h</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.cardNumberRow}>
              <Text style={styles.cardDot}>••••</Text>
              <Text style={styles.cardDot}>••••</Text>
              <Text style={styles.cardDot}>••••</Text>
              <Text style={styles.cardDot}>••••</Text>
            </View>
            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.cardLabel}>{t('balance')}</Text>
                <Text style={styles.cardBalance}>{formatMoney(money)}</Text>
              </View>
              <View style={styles.cardBottomRight}>
                <Text style={styles.cardBrandBottom}>{t('brand_tappay')}</Text>
                {totalPending > 0 ? (
                  <>
                    <Text style={styles.cardLabel}>{t('pending')}</Text>
                    <Text style={styles.cardValue}>{formatMoney(totalPending)}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.cardLabel}>{t('income_hr')}</Text>
                    <Text style={styles.cardValue}>{formatMoney(totalIncome)}</Text>
                  </>
                )}
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtnPrimary} onPress={() => setStartModal(true)}>
            <Ionicons name="rocket" size={18} color="#000" />
            <Text style={styles.actionBtnPrimaryText}>{t('new_business')}</Text>
          </Pressable>
        </View>

        {ownedBusinesses.map((business) => {
          const sub = getSubType(business.type, business.subType);
          const suspended = isSuspended(business);
          const income = getHourlyIncome(business, businessBoostExpiresAt);
          const owed = getTaxOwed(business);
          const industryColor = getIndustryColor(business.type);
          const isPendingType = business.type === 'construction' || business.type === 'dealership' || business.type === 'moviestudio';
          const pendingAmount = business.type === 'construction' ? getConstructionPendingPayout(business) : business.type === 'dealership' ? getDealershipPendingSales(business) : business.type === 'moviestudio' ? getMovieStudioPendingSales(business) : 0;
          const displayIncome = isPendingType ? pendingAmount : income;

          return (
            <Pressable
              key={business.id}
              style={[styles.card, suspended && styles.cardSuspended]}
              onPress={() => setDetailId(business.id)}
            >
              <LinearGradient
                colors={suspended
                  ? ['rgba(239,68,68,0.10)', 'rgba(239,68,68,0.02)']
                  : [`${industryColor}14`, `${industryColor}06`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.cardContent} pointerEvents="none">
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrap, { backgroundColor: suspended ? 'rgba(239,68,68,0.12)' : `${industryColor}18`, borderColor: suspended ? 'rgba(239,68,68,0.25)' : `${industryColor}30` }]}>
                    <Ionicons
                      name={business.type === 'bus' ? 'bus' : business.type === 'courier' ? 'bicycle' : business.type === 'gamedev' ? 'game-controller' : business.type === 'construction' ? 'hammer' : business.type === 'dealership' ? 'car-sport' : business.type === 'clothing' ? 'shirt' : business.type === 'bank' ? 'business' : business.type === 'moviestudio' ? 'film' : 'cafe'}
                      size={22}
                      color={suspended ? '#fca5a5' : industryColor}
                    />
                  </View>
                  <View style={styles.headerText}>
                    <Text style={styles.name}>{tBusinessName(business.type, business.subType) || business.name}</Text>
                    <Text style={[styles.category, { color: suspended ? '#fca5a5' : `${industryColor}aa` }]}>{tBusinessSubCategory(sub.category).toUpperCase()} · {tf('level_max', { level: business.level, max: sub.maxLevel })}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>{isPendingType ? t('pending') : t('income_hr')}</Text>
                    <Text style={[styles.statValue, { color: suspended ? '#ef4444' : '#4ade80' }]}>
                      {formatMoney(displayIncome)}
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>{t('tax_owed')}</Text>
                    <Text style={[styles.statValue, { color: owed > 0 ? '#fbbf24' : '#94a3b8' }]}>
                      {formatMoney(owed)}
                    </Text>
                  </View>
                </View>

                {suspended && (
                  <View style={styles.suspendedBanner}>
                    <Text style={styles.suspendedText}>{t('suspended_tap_taxes')}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        <View style={styles.spacer} />
      </ScrollView>

      {/* Start Business Modal */}
      <Modal visible={startModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, webModalOverlay()]}>
          <View style={[styles.modalSheet, webModalSheet()]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('start_business')}</Text>
              <Pressable onPress={() => setStartModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false}>
            {BUSINESS_CATEGORIES.cafe && (
              <View>
                <Text style={styles.modalSection}>{t('cat_cafe')}</Text>
                {Object.entries(BUSINESS_CATEGORIES.cafe.subTypes).map(([key, sub]) => {
                  const affordable = money >= sub.cost;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.optionRow, !affordable && styles.optionRowDisabled]}
                      onPress={() => handleStart('cafe', key)}
                      disabled={!affordable}
                    >
                      <View style={styles.optionLeft}>
                        <Text style={styles.optionName}>{tBusinessName('cafe', key) || sub.name}</Text>
                        <Text style={styles.optionMeta}>{tBusinessSubCategory(sub.category)} · {tf('biz_desc_cafe', { max: sub.maxLevel })}</Text>
                      </View>
                      <Text style={[styles.optionCost, !affordable && styles.optionCostDisabled]}>
                        {formatMoney(sub.cost)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {BUSINESS_CATEGORIES.bus && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.modalSection}>{t('cat_transport')}</Text>
                {Object.entries(BUSINESS_CATEGORIES.bus.subTypes).map(([key, sub]) => {
                  const affordable = money >= sub.cost;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.optionRow, !affordable && styles.optionRowDisabled]}
                      onPress={() => handleStart('bus', key)}
                      disabled={!affordable}
                    >
                      <View style={styles.optionLeft}>
                        <Text style={styles.optionName}>{tBusinessName('bus', key) || sub.name}</Text>
                        <Text style={styles.optionMeta}>{tBusinessSubCategory(sub.category)} · {t('biz_desc_bus')}</Text>
                      </View>
                      <Text style={[styles.optionCost, !affordable && styles.optionCostDisabled]}>
                        {formatMoney(sub.cost)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {BUSINESS_CATEGORIES.courier && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.modalSection}>{t('cat_logistics')}</Text>
                {Object.entries(BUSINESS_CATEGORIES.courier.subTypes).map(([key, sub]) => {
                  const affordable = money >= sub.cost;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.optionRow, !affordable && styles.optionRowDisabled]}
                      onPress={() => handleStart('courier', key)}
                      disabled={!affordable}
                    >
                      <View style={styles.optionLeft}>
                        <Text style={styles.optionName}>{tBusinessName('courier', key) || sub.name}</Text>
                        <Text style={styles.optionMeta}>{tBusinessSubCategory(sub.category)} · {t('biz_desc_courier')}</Text>
                      </View>
                      <Text style={[styles.optionCost, !affordable && styles.optionCostDisabled]}>
                        {formatMoney(sub.cost)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {BUSINESS_CATEGORIES.clothing && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.modalSection}>{t('cat_fashion')}</Text>
                {Object.entries(BUSINESS_CATEGORIES.clothing.subTypes).map(([key, sub]) => {
                  const affordable = money >= sub.cost;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.optionRow, !affordable && styles.optionRowDisabled]}
                      onPress={() => handleStart('clothing', key)}
                      disabled={!affordable}
                    >
                      <View style={styles.optionLeft}>
                        <Text style={styles.optionName}>{tBusinessName('clothing', key) || sub.name}</Text>
                        <Text style={styles.optionMeta}>{tBusinessSubCategory(sub.category)} · {t('biz_desc_clothing')}</Text>
                      </View>
                      <Text style={[styles.optionCost, !affordable && styles.optionCostDisabled]}>
                        {formatMoney(sub.cost)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {BUSINESS_CATEGORIES.construction && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.modalSection}>{t('cat_construction')}</Text>
                {Object.entries(BUSINESS_CATEGORIES.construction.subTypes).map(([key, sub]) => {
                  const affordable = money >= sub.cost;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.optionRow, !affordable && styles.optionRowDisabled]}
                      onPress={() => handleStart('construction', key)}
                      disabled={!affordable}
                    >
                      <View style={styles.optionLeft}>
                        <Text style={styles.optionName}>{tBusinessName('construction', key) || sub.name}</Text>
                        <Text style={styles.optionMeta}>{tBusinessSubCategory(sub.category)} · {t('biz_desc_construction')}</Text>
                      </View>
                      <Text style={[styles.optionCost, !affordable && styles.optionCostDisabled]}>
                        {formatMoney(sub.cost)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {BUSINESS_CATEGORIES.dealership && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.modalSection}>{t('cat_automotive')}</Text>
                {Object.entries(BUSINESS_CATEGORIES.dealership.subTypes).map(([key, sub]) => {
                  const affordable = money >= sub.cost;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.optionRow, !affordable && styles.optionRowDisabled]}
                      onPress={() => handleStart('dealership', key)}
                      disabled={!affordable}
                    >
                      <View style={styles.optionLeft}>
                        <Text style={styles.optionName}>{tBusinessName('dealership', key) || sub.name}</Text>
                        <Text style={styles.optionMeta}>{tBusinessSubCategory(sub.category)} · {t('biz_desc_dealership')}</Text>
                      </View>
                      <Text style={[styles.optionCost, !affordable && styles.optionCostDisabled]}>
                        {formatMoney(sub.cost)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {BUSINESS_CATEGORIES.gamedev && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.modalSection}>{t('cat_gamedev')}</Text>
                {Object.entries(BUSINESS_CATEGORIES.gamedev.subTypes).map(([key, sub]) => {
                  const affordable = money >= sub.cost;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.optionRow, !affordable && styles.optionRowDisabled]}
                      onPress={() => handleStart('gamedev', key)}
                      disabled={!affordable}
                    >
                      <View style={styles.optionLeft}>
                        <Text style={styles.optionName}>{tBusinessName('gamedev', key) || sub.name}</Text>
                        <Text style={styles.optionMeta}>{tBusinessSubCategory(sub.category)} · {t('biz_desc_gamedev')}</Text>
                      </View>
                      <Text style={[styles.optionCost, !affordable && styles.optionCostDisabled]}>
                        {formatMoney(sub.cost)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {BUSINESS_CATEGORIES.moviestudio && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.modalSection}>{t('cat_entertainment')}</Text>
                {Object.entries(BUSINESS_CATEGORIES.moviestudio.subTypes).map(([key, sub]) => {
                  const affordable = money >= sub.cost;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.optionRow, !affordable && styles.optionRowDisabled]}
                      onPress={() => handleStart('moviestudio', key)}
                      disabled={!affordable}
                    >
                      <View style={styles.optionLeft}>
                        <Text style={styles.optionName}>{tBusinessName('moviestudio', key) || sub.name}</Text>
                        <Text style={styles.optionMeta}>{tBusinessSubCategory(sub.category)} · {t('biz_desc_moviestudio')}</Text>
                      </View>
                      <Text style={[styles.optionCost, !affordable && styles.optionCostDisabled]}>
                        {formatMoney(sub.cost)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {BUSINESS_CATEGORIES.bank && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.modalSection}>{t('cat_finance')}</Text>
                {Object.entries(BUSINESS_CATEGORIES.bank.subTypes).map(([key, sub]) => {
                  const affordable = money >= sub.cost;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.optionRow, !affordable && styles.optionRowDisabled]}
                      onPress={() => handleStart('bank', key)}
                      disabled={!affordable}
                    >
                      <View style={styles.optionLeft}>
                        <Text style={styles.optionName}>{tBusinessName('bank', key) || sub.name}</Text>
                        <Text style={styles.optionMeta}>{tBusinessSubCategory(sub.category)} · {t('biz_desc_bank')}</Text>
                      </View>
                      <Text style={[styles.optionCost, !affordable && styles.optionCostDisabled]}>
                        {formatMoney(sub.cost)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 54,
  },
  content: {
    paddingBottom: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
  },
  cardContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceCard: {
    width: width - 32,
    height: 195,
    borderRadius: 20,
    padding: 18,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    shadowOpacity: 0.4,
    elevation: 12,
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardChip: {
    width: 38,
    height: 28,
    borderRadius: 5,
    backgroundColor: 'rgba(251,191,36,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardBrand: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 4,
    fontStyle: 'italic',
  },
  cardBrandBottom: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  cardNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardDot: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  boostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#4ade80',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  boostBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
  },
  boostActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  boostActiveText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '900',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardBottomRight: {
    alignItems: 'flex-end',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
  },
  cardBalance: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  cardValue: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fbbf24',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  actionBtnPrimaryText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 14,
  },
  actionBtnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  actionBtnGhostText: {
    color: '#e2e8f0',
    fontWeight: '800',
    fontSize: 14,
  },
  card: {
    position: 'relative',
    borderRadius: 24,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  cardSuspended: {
    borderColor: 'rgba(239,68,68,0.3)',
  },
  cardContent: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  category: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  statsRow: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#e2e8f0',
    letterSpacing: -0.3,
  },
  boostTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74,222,128,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 12,
  },
  boostTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ade80',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  rowBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  rowBtnDisabled: {
    opacity: 0.35,
  },
  rowBtnSecondary: {
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  rowBtnDanger: {
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  rowBtnText: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 12,
  },
  rowBtnTextSecondary: {
    color: '#fbbf24',
    fontWeight: '700',
    fontSize: 12,
  },
  rowBtnTextDanger: {
    color: '#fca5a5',
    fontWeight: '700',
    fontSize: 12,
  },
  suspendedBanner: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  suspendedText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '700',
  },
  spacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0f0f0f',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalSection: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionRowDisabled: {
    opacity: 0.4,
  },
  optionLeft: {
    flex: 1,
    marginRight: 12,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  optionMeta: {
    fontSize: 12,
    color: '#64748b',
    flexWrap: 'wrap',
  },
  optionCost: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fbbf24',
    flexShrink: 0,
  },
  optionCostDisabled: {
    color: '#64748b',
  },
  modalLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: '#fbbf24',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveBtnText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 14,
  },
  settingsInfo: {
    gap: 6,
  },
  settingsInfoText: {
    color: '#94a3b8',
    fontSize: 14,
    paddingVertical: 4,
  },
});
