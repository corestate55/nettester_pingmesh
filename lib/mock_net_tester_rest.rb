require 'grape'
require 'rubystats'

class MockNetTesterRest < Grape::API
  format :json

  # accept any rest request
  before do
    header 'Access-Control-Allow-Origin', '*'
    @norm = Rubystats::NormalDistribution.new(0, 30)
  end

  helpers do
    def random_rtt()
      digit = 1000.0 # number of digit
      (@norm.rng.abs * digit).round / digit
    end
  end

  desc 'Frontend View'
  get '/' do
    content_type 'text/html'
    file 'html/index.html'
  end

  get '/pingmesh_view.js' do
    content_type 'text/javascript'
    file 'html/pingmesh_view.js'
  end

  # sample api
  get '/process/:pid' do
    rtt_data = {
        avg: random_rtt,
        min: random_rtt,
        max: random_rtt,
        mdev: random_rtt
    }
    puts "#{params[:pid]}, #{rtt_data}"

    # delay several secs before reply response
    sleep 5 # assume: ping -c4
    rtt_data
  end
end