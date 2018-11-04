import axios from 'axios'
import {parse as parseLinkHeader, Reference} from 'http-link-header'
import {Observable, Observer} from 'rxjs'
interface FetchOptions {
  token: string
  since?: string
}

export function fetch(options: FetchOptions): Observable<any> {
  return Observable.create((observer: Observer<any>) => {
    const doFetch = (address: string) => {
      axios.get(address, {
        headers: {
          authorization: `token ${options.token}`
        }
      }).then((response) => {
        response.data.forEach((issue) => {
          observer.next(issue)
        })
        const links = parseLinkHeader(response.headers.link)
        const next: Reference = links.rel('next')[0]
        if (next) {
          doFetch(next.uri)
        }
      })
    }
    const url = new URL('https://api.github.com/issues')
    url.searchParams.set('filter', 'all')
    if (options.since) {
      url.searchParams.set('since', options.since)
    }
    doFetch(url.toString())
  })

}
let i = 0
fetch({token: 'a47a8399ab3007b1b9aebe7b082f325d891a0257'}).subscribe((issue) => console.log(`${i++} : ${issue.title}`))
