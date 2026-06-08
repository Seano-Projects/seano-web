import { useEffect } from 'react'

const useTitle = title => {
  useEffect(() => {
    document.title = `SeaPortal | ${title}`
  }, [title])
}

export default useTitle
