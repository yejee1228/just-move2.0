import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { TipCard } from '@/data/content';

/**
 * 팁 카드 그림 (16:9). 카드 내용에 맞춘 면 그림이며 tips.json의 id로 고른다.
 * 그림이 없는 새 카드는 종류(레시피/건강)별 기본 그림을 쓴다.
 */
const RED = '#E5533D';
const RED_LIGHT = '#F47B62';
const GREEN = '#4FAE7B';
const GREEN_DARK = '#3A8F63';
const YELLOW = '#F5C04A';
const NAVY = '#173B57';
const BLUE = '#7CC4F0';
const SKIN = '#F2C9A5';
const ORANGE = '#F5A623';
const WHITE = '#FFFFFF';

function Cherry({ x, y, r = 14 }: { x: number; y: number; r?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${r / 14})`}>
      <Circle r={14} fill={RED} />
      <Ellipse cx={-5} cy={-5} rx={3.5} ry={2.5} fill={RED_LIGHT} />
      <Path d="M0 -15 L5 -11 L10 -13 L7 -8 L0 -10 L-7 -8 L-10 -13 L-5 -11 Z" fill={GREEN_DARK} />
    </G>
  );
}

function TomatoHalf({ x, y, r = 20 }: { x: number; y: number; r?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${r / 20})`}>
      <Circle r={20} fill={RED} />
      <Circle r={15.5} fill="#F7927C" />
      <Path d="M0 0 L0 -13 M0 0 L11 7 M0 0 L-11 7" stroke={RED} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={-6} cy={-5} r={1.8} fill="#FFE3B8" />
      <Circle cx={6} cy={-5} r={1.8} fill="#FFE3B8" />
      <Circle cx={0} cy={8} r={1.8} fill="#FFE3B8" />
    </G>
  );
}

function Drop({ x, y, s = 1, color = BLUE }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <Path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -14 C 7 -3 10 1 10 6 A 10 10 0 0 1 -10 6 C -10 1 -7 -3 0 -14 Z"
      fill={color}
    />
  );
}

function Leaf({ x, y, r = 0, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <Path d="M0 0 C 8 -11 21 -11 26 0 C 21 10 8 10 0 0 Z" fill={GREEN} />
      <Path d="M2 0 L 22 0" stroke={GREEN_DARK} strokeWidth={1.3} strokeLinecap="round" />
    </G>
  );
}

function Steam({ x, y }: { x: number; y: number }) {
  return (
    <Path
      transform={`translate(${x} ${y})`}
      d="M0 0 C -9 -9 9 -15 0 -25 C -9 -33 7 -39 0 -47"
      stroke={WHITE}
      strokeWidth={5}
      strokeLinecap="round"
      fill="none"
      opacity={0.85}
    />
  );
}

function Water() {
  return (
    <>
      <Rect width={320} height={180} fill="#DFF1FC" />
      <Circle cx={58} cy={46} r={42} fill={WHITE} opacity={0.6} />
      <Circle cx={272} cy={140} r={58} fill={WHITE} opacity={0.55} />
      <Ellipse cx={160} cy={160} rx={62} ry={8} fill="#BFE0F4" />
      <Path d="M132 88 Q146 79 160 88 T188 88 L183 150 Q182 158 174 158 L146 158 Q138 158 137 150 Z" fill={BLUE} />
      <Path d="M127 34 L193 34 L183 151 Q182 159 174 159 L146 159 Q138 159 137 151 Z" fill={WHITE} opacity={0.35} />
      <Path
        d="M127 34 L193 34 L183 151 Q182 159 174 159 L146 159 Q138 159 137 151 Z"
        stroke="#8FC8EC"
        strokeWidth={4}
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M143 100 L147 145" stroke={WHITE} strokeWidth={5} strokeLinecap="round" opacity={0.75} />
      <Drop x={82} y={104} s={1.5} />
      <Drop x={238} y={72} s={1.15} />
      <Drop x={254} y={120} s={0.8} color="#A5D8F6" />
      <Drop x={60} y={140} s={0.7} color="#A5D8F6" />
    </>
  );
}

function OliveSalad() {
  return (
    <>
      <Rect width={320} height={180} fill="#FDEBD2" />
      <Circle cx={280} cy={30} r={46} fill="#FFF6E8" />
      <Ellipse cx={140} cy={136} rx={116} ry={34} fill="#EFD3AE" />
      <Ellipse cx={140} cy={126} rx={116} ry={36} fill={WHITE} />
      <Ellipse cx={140} cy={124} rx={92} ry={25} fill="#F7EFE3" />
      <TomatoHalf x={94} y={116} r={20} />
      <TomatoHalf x={138} y={108} r={21} />
      <TomatoHalf x={182} y={118} r={20} />
      <TomatoHalf x={118} y={134} r={16} />
      <TomatoHalf x={160} y={136} r={16} />
      <Leaf x={112} y={100} r={-40} s={0.75} />
      <Leaf x={160} y={98} r={-115} s={0.7} />
      <Rect x={258} y={78} width={34} height={78} rx={9} fill="#A8B94E" />
      <Rect x={266} y={48} width={18} height={34} rx={4} fill="#A8B94E" />
      <Rect x={263} y={38} width={24} height={14} rx={4} fill={NAVY} />
      <Rect x={262} y={102} width={26} height={30} rx={4} fill="#FFF6E8" />
      <Ellipse cx={275} cy={117} rx={7} ry={10} fill="#6F8A2E" />
    </>
  );
}

function Stretch() {
  return (
    <>
      <Rect width={320} height={180} fill="#EAF0FB" />
      <Circle cx={258} cy={46} r={26} fill={WHITE} stroke={NAVY} strokeWidth={4} />
      <Path d="M258 46 L258 31 M258 46 L269 52" stroke={NAVY} strokeWidth={4} strokeLinecap="round" />
      <Rect x={0} y={156} width={320} height={24} fill="#D6E1F3" />
      <Rect x={52} y={72} width={14} height={62} rx={6} fill="#7B68EE" />
      <Rect x={52} y={112} width={58} height={13} rx={6} fill="#7B68EE" />
      <Path d="M60 125 L60 158 M102 125 L102 158" stroke="#5B4CC4" strokeWidth={6} strokeLinecap="round" />
      <Path d="M165 118 L156 158 M179 118 L188 158" stroke={NAVY} strokeWidth={12} strokeLinecap="round" />
      <Rect x={154} y={70} width={36} height={56} rx={14} fill={ORANGE} />
      <Path d="M158 80 L134 48 M186 80 L210 48" stroke={SKIN} strokeWidth={10} strokeLinecap="round" />
      <Circle cx={172} cy={50} r={17} fill={SKIN} />
      <Path d="M156 47 C 158 28 186 28 188 47 C 178 40 166 40 156 47 Z" fill={NAVY} />
      <Path d="M122 74 C 110 62 112 40 126 30" stroke={ORANGE} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path d="M222 74 C 234 62 232 40 218 30" stroke={ORANGE} strokeWidth={4} strokeLinecap="round" fill="none" />
    </>
  );
}

function EggPan() {
  return (
    <>
      <Rect width={320} height={180} fill="#FFF1DC" />
      <Circle cx={40} cy={36} r={50} fill="#FFF9EE" />
      <Steam x={118} y={66} />
      <Steam x={158} y={58} />
      <Steam x={198} y={66} />
      <Rect x={232} y={101} width={84} height={16} rx={8} fill={NAVY} />
      <Ellipse cx={150} cy={122} rx={100} ry={46} fill={NAVY} />
      <Ellipse cx={150} cy={114} rx={100} ry={46} fill="#3D5468" />
      <Ellipse cx={150} cy={114} rx={85} ry={36} fill="#566D80" />
      <Path
        d="M92 112 C 92 92 122 88 138 92 C 154 82 196 88 206 106 C 216 124 192 138 166 136 C 146 146 96 136 92 112 Z"
        fill={YELLOW}
      />
      <Circle cx={124} cy={108} r={11} fill="#FBD978" />
      <Circle cx={176} cy={118} r={12} fill="#FBD978" />
      <Rect x={134} y={100} width={22} height={18} rx={6} fill={RED} transform="rotate(-14 145 109)" />
      <Rect x={104} y={118} width={20} height={16} rx={6} fill={RED_LIGHT} transform="rotate(18 114 126)" />
      <Rect x={176} y={96} width={20} height={16} rx={6} fill={RED} transform="rotate(24 186 104)" />
      <Rect x={152} y={124} width={18} height={14} rx={5} fill={RED_LIGHT} transform="rotate(-8 161 131)" />
    </>
  );
}

function Breathe() {
  return (
    <>
      <Rect width={320} height={180} fill="#E2F6F2" />
      <Circle cx={160} cy={92} r={72} fill="#C8EEE6" />
      <Circle cx={160} cy={92} r={48} fill="#B3E6DB" />
      <Path d="M36 76 C 66 58 80 92 110 74" stroke="#4DBFAA" strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M22 108 C 56 90 72 124 112 104" stroke="#7DD3C2" strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M284 76 C 254 58 240 92 210 74" stroke="#4DBFAA" strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M298 108 C 264 90 248 124 208 104" stroke="#7DD3C2" strokeWidth={5} strokeLinecap="round" fill="none" />
      <Ellipse cx={160} cy={150} rx={62} ry={15} fill={NAVY} />
      <Path d="M136 146 C 134 104 186 104 184 146 Z" fill="#20B2AA" />
      <Path d="M138 118 C 120 128 116 140 118 148 M182 118 C 200 128 204 140 202 148" stroke={SKIN} strokeWidth={9} strokeLinecap="round" fill="none" />
      <Circle cx={160} cy={78} r={21} fill={SKIN} />
      <Path d="M139 74 C 142 50 178 50 181 74 C 170 64 150 64 139 74 Z" fill={NAVY} />
      <Path d="M149 80 q5 4 10 0 M163 80 q5 4 10 0" stroke={NAVY} strokeWidth={2.4} strokeLinecap="round" fill="none" transform="translate(-1 0)" />
      <Leaf x={40} y={150} r={-30} s={1.1} />
      <Leaf x={280} y={150} r={-150} s={1.1} />
    </>
  );
}

function YogurtCup() {
  return (
    <>
      <Rect width={320} height={180} fill="#FCE9EC" />
      <Circle cx={272} cy={40} r={44} fill="#FFF4F6" />
      <Circle cx={46} cy={150} r={52} fill="#FFF4F6" />
      <Ellipse cx={160} cy={164} rx={58} ry={7} fill="#F2CFD6" />
      <Path d="M112 58 L208 58 L192 152 Q191 162 180 162 L140 162 Q129 162 128 152 Z" fill="#FFFDF8" />
      <Path d="M117 88 Q138 100 160 88 T203 88 L198 118 Q178 128 160 118 T122 118 Z" fill="#F7A8A0" opacity={0.75} />
      <Path d="M112 58 L208 58 L192 152 Q191 162 180 162 L140 162 Q129 162 128 152 Z" stroke="#EFC6CE" strokeWidth={4} strokeLinejoin="round" fill="none" />
      <Path d="M106 58 C 112 34 208 34 214 58 Z" fill="#FFFDF8" />
      <TomatoHalf x={136} y={44} r={14} />
      <Cherry x={170} y={36} r={13} />
      <TomatoHalf x={192} y={48} r={11} />
      <Ellipse cx={154} cy={54} rx={8} ry={5} fill="#B98A5E" transform="rotate(-20 154 54)" />
      <Ellipse cx={178} cy={55} rx={7} ry={4.5} fill="#A07548" transform="rotate(25 178 55)" />
      <Path d="M120 60 C 122 74 128 72 129 62 M198 60 C 197 80 190 80 189 62" stroke={YELLOW} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Path d="M240 54 L262 150" stroke="#C7D0D9" strokeWidth={7} strokeLinecap="round" />
      <Ellipse cx={236} cy={40} rx={13} ry={19} fill="#C7D0D9" transform="rotate(-13 236 40)" />
    </>
  );
}

function WalkFar() {
  return (
    <>
      <Rect width={320} height={180} fill="#DDF0FB" />
      <Circle cx={160} cy={82} r={40} fill="#FFE6A3" />
      <Circle cx={160} cy={82} r={27} fill={YELLOW} />
      <Ellipse cx={58} cy={38} rx={26} ry={9} fill={WHITE} />
      <Ellipse cx={268} cy={30} rx={32} ry={10} fill={WHITE} />
      <Path d="M0 106 C 60 76 120 92 170 102 C 220 112 270 80 320 100 L320 180 L0 180 Z" fill="#A9DDB4" />
      <Path d="M0 130 C 70 104 250 104 320 130 L320 180 L0 180 Z" fill="#7CCB92" />
      <Path d="M150 110 L170 110 L252 180 L68 180 Z" fill="#FFF2DC" />
      <Path d="M160 116 L160 128 M160 138 L160 154 M160 164 L160 180" stroke="#F2D7AE" strokeWidth={4} strokeLinecap="round" />
      <Path d="M107 134 L96 170 M117 134 L134 168" stroke={NAVY} strokeWidth={10} strokeLinecap="round" />
      <Rect x={98} y={92} width={28} height={48} rx={12} fill={ORANGE} />
      <Path d="M104 102 L86 126 M120 102 L140 122" stroke={SKIN} strokeWidth={8} strokeLinecap="round" />
      <Circle cx={113} cy={76} r={15} fill={SKIN} />
      <Path d="M98 74 C 100 56 126 56 128 74 C 118 66 108 66 98 74 Z" fill={NAVY} />
      <Path d="M132 74 L150 74" stroke={ORANGE} strokeWidth={3} strokeDasharray="4 5" strokeLinecap="round" />
    </>
  );
}

function Sandwich() {
  return (
    <>
      <Rect width={320} height={180} fill="#FCEFD9" />
      <Circle cx={60} cy={44} r={46} fill="#FFF8EA" />
      <Circle cx={270} cy={150} r={56} fill="#FFF8EA" />
      <Ellipse cx={160} cy={160} rx={108} ry={10} fill="#EBD6B3" />
      <Rect x={70} y={132} width={180} height={26} rx={10} fill="#C99B66" />
      <Rect x={76} y={130} width={168} height={18} rx={8} fill="#E6C694" />
      <Path d="M62 128 q14 -12 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 L258 120 L62 120 Z" fill={GREEN} />
      <Ellipse cx={108} cy={116} rx={34} ry={9} fill={WHITE} />
      <Ellipse cx={108} cy={115} rx={15} ry={5} fill={YELLOW} />
      <Ellipse cx={194} cy={116} rx={36} ry={9} fill={WHITE} />
      <Ellipse cx={194} cy={115} rx={15} ry={5} fill={YELLOW} />
      <Rect x={66} y={96} width={92} height={12} rx={6} fill={RED} />
      <Rect x={162} y={96} width={92} height={12} rx={6} fill={RED_LIGHT} />
      <Path d="M72 96 C 62 96 62 58 92 54 L228 54 C 258 58 258 96 248 96 Z" fill="#C99B66" />
      <Path d="M80 92 C 72 90 74 64 96 62 L224 62 C 246 64 248 90 240 92 Z" fill="#E6C694" />
      <Path d="M160 58 L160 22" stroke="#B98A5E" strokeWidth={4} strokeLinecap="round" />
      <Cherry x={160} y={24} r={13} />
    </>
  );
}

function SleepNight() {
  return (
    <>
      <Rect width={320} height={180} fill="#1F3A5F" />
      <Circle cx={260} cy={46} r={26} fill="#FBE29A" />
      <Circle cx={250} cy={40} r={23} fill="#1F3A5F" />
      <Circle cx={42} cy={34} r={3} fill={WHITE} />
      <Circle cx={108} cy={52} r={2.4} fill={WHITE} />
      <Circle cx={164} cy={26} r={3} fill="#FBE29A" />
      <Circle cx={206} cy={66} r={2.2} fill={WHITE} />
      <Circle cx={72} cy={78} r={2.2} fill="#FBE29A" />
      <Circle cx={296} cy={92} r={2.4} fill={WHITE} />
      <Rect x={0} y={158} width={320} height={22} fill="#152B49" />
      <Rect x={34} y={92} width={16} height={72} rx={6} fill="#8B6A4A" />
      <Rect x={272} y={118} width={14} height={46} rx={6} fill="#8B6A4A" />
      <Rect x={46} y={132} width={230} height={22} rx={8} fill="#C9D6E6" />
      <Ellipse cx={82} cy={124} rx={30} ry={12} fill={WHITE} />
      <Circle cx={86} cy={110} r={17} fill={SKIN} />
      <Path d="M70 104 C 76 88 100 90 103 104 C 92 98 80 98 70 104 Z" fill={NAVY} />
      <Path d="M80 113 q4 3 8 0" stroke={NAVY} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Path d="M106 134 C 122 112 142 106 164 96 C 186 90 200 106 216 118 C 236 124 262 124 274 134 Z" fill="#7B68EE" />
      <Path d="M138 124 C 156 112 176 110 192 122" stroke="#A99BF5" strokeWidth={4} strokeLinecap="round" fill="none" />
    </>
  );
}

function MisoSoup() {
  return (
    <>
      <Rect width={320} height={180} fill="#FBE9DA" />
      <Circle cx={276} cy={38} r={46} fill="#FFF5EC" />
      <Steam x={124} y={72} />
      <Steam x={162} y={64} />
      <Steam x={200} y={72} />
      <Ellipse cx={160} cy={166} rx={70} ry={8} fill="#EBCDB3" />
      <Path d="M58 92 L262 92 C 262 136 226 164 192 164 L128 164 C 94 164 58 136 58 92 Z" fill={NAVY} />
      <Path d="M76 118 C 96 110 112 126 132 118 C 152 110 170 126 190 118 C 210 110 228 124 244 118" stroke="#3D5C78" strokeWidth={5} fill="none" strokeLinecap="round" />
      <Ellipse cx={160} cy={92} rx={102} ry={27} fill={NAVY} />
      <Ellipse cx={160} cy={92} rx={93} ry={22} fill="#D79A55" />
      <Rect x={98} y={78} width={26} height={20} rx={4} fill={WHITE} transform="rotate(-10 111 88)" />
      <Rect x={186} y={84} width={26} height={20} rx={4} fill={WHITE} transform="rotate(12 199 94)" />
      <Rect x={142} y={92} width={22} height={16} rx={4} fill="#FFF6E8" transform="rotate(6 153 100)" />
      <TomatoHalf x={150} y={80} r={13} />
      <TomatoHalf x={222} y={84} r={10} />
      <TomatoHalf x={92} y={98} r={9} />
      <Circle cx={128} cy={100} r={4.5} fill="none" stroke={GREEN} strokeWidth={3} />
      <Circle cx={180} cy={78} r={4.5} fill="none" stroke={GREEN} strokeWidth={3} />
      <Circle cx={176} cy={104} r={4} fill="none" stroke={GREEN_DARK} strokeWidth={3} />
    </>
  );
}

const ART: Record<string, () => React.JSX.Element> = {
  'tip-01': Water,
  'tip-02': OliveSalad,
  'tip-03': Stretch,
  'tip-04': EggPan,
  'tip-05': Breathe,
  'tip-06': YogurtCup,
  'tip-07': WalkFar,
  'tip-08': Sandwich,
  'tip-09': SleepNight,
  'tip-10': MisoSoup,
};

export function TipArt({ tip }: { tip: TipCard }) {
  const Art = ART[tip.id] ?? (tip.type === 'recipe' ? MisoSoup : Water);
  return (
    <Svg width="100%" height="100%" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">
      <Art />
    </Svg>
  );
}
