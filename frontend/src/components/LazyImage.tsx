import { useState } from 'react'

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  sources?: { srcSet: string; type: string }[]
}

export function LazyImage({ sources = [], alt = '', className = '', ...rest }: Props) {
  const [loaded, setLoaded] = useState(false)
  return (
    <picture>
      {sources.map((s, i) => (
        <source key={i} srcSet={s.srcSet} type={s.type} />
      ))}
      <img
        loading="lazy"
        decoding="async"
        alt={alt}
        className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        {...rest}
      />
    </picture>
  )
}
