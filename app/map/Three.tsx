// /app/map/three/page.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./Map.module.css";
import { normalizeSearchString } from "@/utils/normalizeKana";
import { FestivalItem, festivalItems } from "@/utils/festival";
import { useRouter } from "next/navigation";
import Image from "next/image";

// 基準解像度（最大サイズ：1000×749px）
const BASE_WIDTH = 1000;
const BASE_HEIGHT = 749;


/**
 * カスタムフック：指定要素のサイズ（幅・高さ）を取得する
 */
function useContainerDimensions(ref: React.RefObject<HTMLElement>) {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    useEffect(() => {
        if (!ref.current) return;
        const updateDimensions = () => {
            const rect = ref.current!.getBoundingClientRect();
            setDimensions({ width: rect.width, height: rect.height });
        };
        updateDimensions();
        const resizeObserver = new ResizeObserver(() => updateDimensions());
        resizeObserver.observe(ref.current);
        return () => {
            resizeObserver.disconnect();
        };
    }, [ref]);
    return dimensions;
}

/**
 * ピン表示コンポーネント  
 * ・festivalItems の座標は BASE_WIDTH×BASE_HEIGHT を基準としたピクセル値で指定  
 * ・現在のマップサイズとの比率でピンの位置・サイズを計算します
 */
interface PinProps {
    item: FestivalItem;
    isSelected: boolean;
    containerWidth: number;
    containerHeight: number;
}

const Pin: React.FC<PinProps> = ({
    item,
    isSelected,
    containerWidth,
}) => {
    if (!isSelected) return null;
    const scaleFactor = containerWidth / BASE_WIDTH;
    const baseIconSize = 100;
    const baseHitBoxSize = 40;
    const iconSize = Math.round(baseIconSize * scaleFactor);
    const hitBoxSize = Math.round(baseHitBoxSize * scaleFactor);
    const leftPx = item.x! * scaleFactor;
    const topPx = item.y! * scaleFactor;

    return (
        <div
            className={styles.pinWrapper}
            style={{
                left: `${leftPx}px`,
                top: `${topPx}px`,
                width: hitBoxSize,
                height: hitBoxSize,
                marginLeft: `-${hitBoxSize / 2}px`,
                marginTop: `-${hitBoxSize / 2}px`,
            }}
        >
            <div
                className={styles.pinContent}
                style={{
                    transform: "rotateY(-30deg)",
                    pointerEvents: "none",
                    position: "relative",
                    width: "100%",
                    height: "100%",
                }}
            >
                <div
                    className={styles.iconWrapper}
                    style={{
                        width: iconSize,
                        height: iconSize,
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                    }}
                >
                    <Image
                        src="/mappin.png"
                        alt="Map Pin"
                        width={iconSize}
                        height={iconSize}
                        priority
                        style={{ objectFit: "contain" }}
                    />
                </div>
            </div>
        </div>
    );
};

const floors = [1, 2, 3, 4];

export default function Three() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [activeFloor, setActiveFloor] = useState<number>(1);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedItem, setSelectedItem] = useState<FestivalItem | null>(null);
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const normalizedSearchQuery = normalizeSearchString(searchQuery);

    const suggestions = searchQuery
        ? festivalItems.filter((item) => {
            const normalizedTitle = normalizeSearchString(item.title);
            const normalizedReading = item.reading ? normalizeSearchString(item.reading) : "";
            const normalizedClass = item.class ? normalizeSearchString(item.class) : "";

            return (
                normalizedTitle.includes(normalizedSearchQuery) ||
                normalizedReading.includes(normalizedSearchQuery) ||
                normalizedClass.includes(normalizedSearchQuery)
            );
        })
        : [];

    // URLのクエリパラメータ "id" をチェックし、あれば対象のイベントを選択し、検索ボックスに反映
    useEffect(() => {
        const id = searchParams.get("id");

        if (id !== null && id !== "") {
            const decodedId = decodeURIComponent(id);
            const foundEvent = festivalItems.find(
                (item) => item.title === decodedId
            );
            if (foundEvent) {
                setSelectedItem(foundEvent);
                setSearchQuery(foundEvent.title);
                setActiveFloor(foundEvent.floor!);
            } else {
                setSelectedItem(null);
                setSearchQuery("");
            }
        } else {
            setSelectedItem(null);
            setSearchQuery("");
        }

        // 初期化完了フラグをON
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (!isInitialized) return;

        router.push(`?id=${encodeURIComponent(searchQuery)}`, { scroll: false });
    }, [searchQuery, isInitialized]);

    // マップコンテナの ref（CSS で各ブレークポイントごとに固定ピクセル指定）
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const { width: mapWidth, height: mapHeight } = useContainerDimensions(
        mapContainerRef
    );

    return (
        <div className={styles.outerContainer}>
            {/**トップ画像 */}
            <div className="toppers">
                <picture>
                    <source
                        media="(min-width:1024px)"
                        srcSet="/header/header-pc.png"
                    />
                    <source
                        media="(min-width:660px)"
                        srcSet="/header/header-pd.png"
                    />
                    <Image
                        className="header-leave"
                        src="/header/header-sp.png"
                        alt=""
                        width={3000}
                        height={2000}
                        priority
                    />
                </picture>
                <header className="h-header">
                    <h1 className="h-title">MAP</h1>
                </header>
            </div>

            {/* サーチボックス */}
            <div className={styles.header}>
                <div className={styles.Esearch}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSuggestions(true);
                        }}
                        className={styles.searchInput}
                        placeholder="イベントを検索..."
                    />
                    {searchQuery && (
                        <button className={styles.Eclear} onClick={() => setSearchQuery('')}>
                            ×
                        </button>
                    )}
                </div>
                {showSuggestions && suggestions.length > 0 && (
                    <div className={styles.suggestionList}>
                        {suggestions.map((item, index) => (
                            <div
                                key={index}
                                className={styles.suggestionItem}
                                onClick={() => {
                                    setSelectedItem(item);
                                    setActiveFloor(item.floor!);
                                    setSearchQuery(item.title);
                                    setShowSuggestions(false);
                                }}
                            >
                                <div className={styles.suggestionClass}>{item.class}</div>
                                <div className={styles.suggestionTitle}>{item.title}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 階層選択ボタン（ヘッダー内配置） */}
            <div className={styles.floorSelector}>
                <div className={styles.buttonContainer}>
                    <div
                        className={styles.slider}
                        style={{
                            left: `${(activeFloor - 1) * (100 / floors.length)}%`,
                            width: `${100 / floors.length}%`,
                        }}
                    ></div>
                    {floors.map((floor) => (
                        <button
                            key={floor}
                            onClick={() => setActiveFloor(floor)}
                            className={
                                floor === activeFloor
                                    ? `${styles.button} ${styles.activeButton}`
                                    : styles.button
                            }
                        >
                            {floor}階
                        </button>
                    ))}
                </div>
            </div>

            {/* マップ表示部分 */}
            <div className={styles.mapWrapper}>
                {/* mapContainer は各ブレークポイントで固定ピクセルサイズに設定 */}
                <div className={styles.mapContainer} ref={mapContainerRef}>
                    <div className={styles.innerContainer}>
                        {floors
                            .filter((floor) => floor <= activeFloor)
                            .map((floor) => (
                                <div
                                    key={floor}
                                    className={styles.floor}
                                    style={{
                                        transform: `scale(${1 - (activeFloor - floor) * 0.1})`,
                                        zIndex: floor,
                                        opacity: floor === activeFloor ? 1 : 0.05,
                                        transition: "transform 0.3s ease, opacity 0.3s ease",
                                        position: "absolute",
                                        left: 0,
                                        width: "100%",
                                        height: "100%",
                                    }}
                                >
                                    <Image
                                        src={`/maps/map_${floor}.svg`}
                                        alt={`${floor}階`}
                                        fill
                                        className={styles.mapImage}
                                    />
                                    {selectedItem && selectedItem.floor === floor && (
                                        <Pin
                                            item={selectedItem}
                                            isSelected={true}
                                            containerWidth={mapWidth}
                                            containerHeight={mapHeight}
                                        />
                                    )}
                                </div>
                            ))}
                    </div>
                </div>
            </div>
            <div className={styles.expMap}>
                <div className={styles.expMapExp}>
                    -マップの見方-
                </div>
                <div className={styles.expBox}>
                    <div className={styles.expClass}>0-0 (場所)</div>
                    <div className={styles.expTitle}>0-0 (団体)</div>
                </div>
            </div>
        </div>
    );
}
