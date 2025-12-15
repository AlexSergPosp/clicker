# ТЗ: Idle Clicker про сбор авто

## Базовая петля
- Первая сессия длится 30 минут; базовая целевая — 60 минут. Скорость прохождения увеличивается за счет бустов и кликов (прогресс растет быстрее).
- Экран сборки: таймер, прогресс-бар «собираем авто», блокировка ввода, затемненная «секретная» машина до выбора награды. Всегда видны обе валюты и навигация.
- По завершении таймера игрок выбирает 1 авто из 2 предложенных из пула открытых. После выбора запускается кулдаун `nextCarCooldownMinutes` (10 минут по умолчанию) перед следующей сессией.
- Полученное авто добавляется в коллекцию и дает буст. После продажи коллекции бусты машин из нее исчезают (машины считаются проданными, но остаются «известными»).

## Авто, теги, коллекции
- У авто: файл арта из `Cars/` (если нет — эмодзи 🚗), редкость, 1–5 тегов, параметры буста (актив/пассив).
- Теги и коллекции фиксированы. Коллекции скрыты как «неизвестные», пока не открыт хотя бы один авто из набора.
- При получении авто открывается 1 случайный тег из его набора; остальные скрыты до следующих выпадений того же авто.
- Коллекция собрана, когда есть все авто из ее списка. За первый продажу — 5 гемов, повторные — 1 гем. После продажи авто помечаются проданными (без буста), коллекция остается видимой.
- Финальная цель — собрать все авто.

## Стартовый пул авто (10 штук)
| ID | Файл | Имя | Редкость | Теги | Буст |
| --- | --- | --- | --- | --- | --- |
| car_apex_bolt | transport_stat_donate_1.png | Apex Bolt | Rare | sport, turbo, aero, track | +40% актив, +10% пассив |
| car_midnight_hauler | transport_stat_donate_2.png | Midnight Hauler | Uncommon | diesel, utility, offroad | +15% пассив |
| car_cerulean_sprinter | transport_stat_donate_3.png | Cerulean Sprinter | Rare | sport, tuner, neon, compact | +25% актив |
| car_ironclad_scout | transport_stat_modifier_1.png | Ironclad Scout | Common | offroad, rugged, diesel | +10% пассив |
| car_solar_pulse | transport_stat_modifier_1_1.png | Solar Pulse | Rare | electric, compact, aero, futuristic | +20% пассив |
| car_crimson_drift | transport_stat_modifier_2.png | Crimson Drift | Rare | tuner, drift, sport, neon | +30% актив |
| car_alpine_trail | transport_stat_modifier_2_1.png | Alpine Trail | Uncommon | offroad, turbo, sport | +10% актив, +10% пассив |
| car_velvet_royale | transport_stat_modifier_3.png | Velvet Royale | Epic | luxury, comfort, touring, leather | +35% пассив |
| car_stealth_phantom | transport_stat_modifier_3_1.png | Stealth Phantom | Epic | stealth, aero, exotic, carbon | +35% актив |
| car_thunder_wagon | transport_stat_modifier_4.png | Thunder Wagon | Uncommon | muscle, turbo, diesel | +20% актив, +5% пассив |

## Дополнительные авто (закрыты, открываются за гемы)
- car_copper_runner (common) — transport_stat_modifier_1_2.png — compact, utility — +8% пассив  
- car_azure_courier (uncommon) — transport_stat_modifier_1_3.png — utility, aero, compact — +5% актив, +12% пассив  
- car_stormliner (epic) — transport_stat_modifier_4_1.png — aero, luxury, touring, carbon — +15% актив, +25% пассив  
- car_blaze_pickup (uncommon) — transport_stat_modifier_5.png — utility, muscle, offroad — +18% актив  
- car_forge_titan (rare) — transport_stat_modifier_5_1.png — rugged, diesel, muscle, offroad — +20% актив, +10% пассив  
- car_glacier_trek (rare) — transport_stat_modifier_6.png — offroad, comfort, touring, rugged — +25% пассив  
- car_helix_runner (rare) — transport_stat_modifier_6_1.png — aero, tuner, sport, compact — +28% актив  
- car_obsidian_crawler (epic) — transport_stat_modifier_7.png — stealth, offroad, rugged, carbon — +22% актив, +18% пассив  
- car_vortex_arrow (epic) — transport_stat_modifier_7_1.png — aero, turbo, exotic, sport — +40% актив  
- car_pulse_city (uncommon) — transport_stat_modifier_8.png — compact, neon, utility — +12% пассив  
- car_crystal_glide (rare) — transport_stat_modifier_8_1.png — luxury, comfort, aero, electric — +28% пассив  
- car_shadow_warden (epic) — transport_stat_modifier_9.png — stealth, muscle, carbon, tuner — +35% актив  
- car_nova_sprint (rare) — transport_stat_modifier_9_1.png — turbo, aero, compact, sport — +30% актив  
- car_titan_haul (common) — transport_stat_modifier_10.png — utility, diesel, rugged — +10% пассив  
- car_chrome_lance (rare) — transport_stat_modifier_10_1.png — aero, exotic, track, carbon — +32% актив  
- car_eclipse_royale (legendary) — transport_stat_modifier_11.png — luxury, exotic, carbon, touring, stealth — +45% пассив  
- car_aurora_drift (epic) — transport_stat_modifier_12.png — drift, neon, tuner, sport — +38% актив  
- car_maglev_whisper (legendary) — transport_stat_modifier_13.png — electric, futuristic, aero, comfort, luxury — +50% пассив  
- car_howl_charger (epic) — transport_stat_modifier_14.png — muscle, turbo, track, sport — +42% актив  
- car_zenith_pulse (legendary) — transport_stat_modifier_15.png — electric, futuristic, exotic, carbon, aero — +45% актив, +10% пассив  

## Теги (фиксированный пул)
sport, turbo, aero, track, diesel, utility, offroad, rugged, electric, compact, futuristic, tuner, drift, neon, luxury, comfort, touring, leather, stealth, exotic, carbon, muscle.

## Коллекции (10 штук)
1) Track Kings — sport, aero, track (Apex Bolt + Alpine Trail + Stealth Phantom).  
2) Street Neon — tuner, drift, neon (Cerulean Sprinter + Crimson Drift).  
3) Heavy Duty — diesel, utility, rugged (Midnight Hauler + Ironclad Scout + Thunder Wagon).  
4) Green Pulse — electric, futuristic, compact (Solar Pulse).  
5) Grand Tour — luxury, comfort, touring, leather (Velvet Royale).  
6) Silent Strike — stealth, exotic, carbon (Stealth Phantom).  
7) Boost Brigade — turbo, muscle, offroad (Thunder Wagon + Alpine Trail + Apex Bolt).  
8) City Micro — compact, utility, aero (Cerulean Sprinter + Solar Pulse).  
9) Night Run — neon, stealth, sport (Stealth Phantom + Crimson Drift).  
10) Full Garage — все авто (глобальная коллекция).  

## Бусты от авто
- Активный: множитель к клику. Пассивный: ресурс/сек. Каждый открытый тег у авто дает +10% к его базовому бусту.
- При продаже коллекции бусты её авто пропадают (машины проданы), но остаются известными; для повторного сбора нужно заново выбить авто.

## Апгрейды (10 штук, по 100 уровней)
- Элементы: Колеса, Двигатель, Турбина, КПП, Подвеска, Кузов, Двери, Интерьер, Электроника, Шины.
- Типы: активные (Колеса, Турбина, КПП, Кузов, Шины), пассивные (Двигатель, Подвеска, Интерьер, Электроника), гибрид (Двери: пассив + малый актив).
- Формулы: бонус уровня = `baseBonus * level^0.9` (актив в %, пассив в ед/сек). Стоимость уровня = `baseCost * 1.12^(level-1)`. Базы: актив ~5%, пассив ~0.5/сек.
- Прогресс-бар сборки = доля купленных уровней от общего числа.

## Редкости и баланс
- Редкости: Common, Uncommon, Rare, Epic, Legendary.
- Шансы выпадения (при выборе 2 карт): 40/30/20/9/1%.
- Количество тегов: 1–2 / 2–3 / 3–4 / 4–5 / 5.
- Стоимость разблокировки: 1 / 2 / 4 / 7 / 12 гемов.
- Множитель буста по редкости: 1.0 / 1.15 / 1.35 / 1.6 / 2.0 (заложено в конфигах для дальнейшего баланса).

## Конфиг (`config.json` подобие)
- `sessionDurationMinutes` = 30 (тест), целевое 60.  
- `nextCarCooldownMinutes` = 10.  
- `rarities` — таблица шансов, тегов, стоимости, множителей.  
- `cars` — список авто (id, name, file/emoji, rarity, tags[], boost {activePct, passivePerSec}, locked).  
- `collections` — id, имя, теги/авто, награда first=5 repeat=1.  
- `upgrades` — список апгрейдов, levelCap=100, формулы бонуса и цены.  
- `rng.seed` — для воспроизводимости.  

## Экономика
- Валюты: мягкая (кликер) и гемы.
- Награда за сессию: выбор 1 из 2 авто из открытого пула.
- Гемы: за коллекции (5/1), тратятся на разблокировку авто.

## UI/UX
- Кликер: таймер, прогресс, кнопка клика, 10 апгрейдов, прогресс сборки (по уровням), обе валюты.
- Выбор авто: 2 карточки с картинкой/эмодзи, редкостью, открытым тегом (остальные скрыты).
- Коллекции: прогресс, неизвестные скрыты до первого авто, кнопка «Продать коллекцию» (снимает бусты авто).
- Разблокировка: список закрытых авто с ценой и редкостью, показывает эмодзи если нет арта.
- Навигация доступна везде; валюты всегда видны.

## Случайность и честность
- Все шансы и таблицы в конфиге; генератор с seed для тестов.

## Технические заметки
- Веб (HTML/JS/CSS), офлайн.
- Состояние: localStorage (открытые/проданные авто, теги, коллекции, апгрейды, таймеры, валюта, настройки).
- Таймеры восстанавливаются по системному времени после перезапуска.
